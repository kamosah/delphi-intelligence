"""
Integration tests for auth sync outbox system.

Tests the complete outbox processing flow following TESTING.md philosophy:
- Test REAL database state changes (status, retry_count, timestamps)
- Test REAL SpiceDB synchronization (not mocks)
- Use proper fixtures with cleanup
- Verify end-to-end business logic through database AND SpiceDB assertions
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.config import settings
from app.db.session import get_session
from app.main import app
from app.models.auth_sync_outbox import AuthSyncOutbox
from app.schemas.outbox import AuthSyncEventType, AuthSyncStatus
from app.schemas.spicedb import CheckPermissionInput
from app.services.outbox_processor import OutboxProcessor


@pytest.mark.asyncio
class TestOutboxProcessor:
    """Test outbox processor batch processing and retry logic.

    Philosophy: Test real database state changes AND real SpiceDB synchronization.
    No mocks - verify end-to-end flow from outbox → SpiceDB.
    """

    @pytest.fixture
    async def outbox_processor(self, db_session):
        """Create outbox processor with test database."""
        processor = OutboxProcessor(db_session)
        return processor

    @pytest.fixture
    async def sample_outbox_item(self, db_session, test_resource_ids):
        """Create a sample outbox item for testing with unique IDs.

        Returns real database item - tests will verify state changes.
        """
        org_id = test_resource_ids("org")
        owner_id = test_resource_ids("user")

        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={
                "organization_id": org_id,
                "owner_id": owner_id,
                "name": "Test Org",
                "slug": "test-org",
            },
            status=AuthSyncStatus.PENDING,
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)
        return item

    async def test_process_batch_success(
        self, outbox_processor, sample_outbox_item, db_session, spicedb_service
    ):
        """Test successful batch processing updates REAL database AND SpiceDB."""
        # Process batch (uses REAL SpiceDB service)
        stats = await outbox_processor.process_batch(limit=10)

        # Verify stats reflect processing
        assert stats["processed_count"] == 1
        assert stats["success_count"] == 1
        assert stats["failed_count"] == 0
        assert stats["dead_letter_count"] == 0

        result = await db_session.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.id == sample_outbox_item.id)
        )
        item = result.scalar_one()

        assert item.status == AuthSyncStatus.COMPLETED
        assert item.processed_at is not None
        assert item.processed_at <= datetime.now(UTC)
        assert item.last_error is None

        # Verify REAL SpiceDB relationship created
        org_id = sample_outbox_item.event_data["organization_id"]
        owner_id = sample_outbox_item.event_data["owner_id"]

        # Check that owner has permissions on the organization
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="manage_settings",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        assert has_permission is True

    async def test_process_batch_with_retry(self, outbox_processor, db_session):
        """Test failed processing schedules retry in REAL database.

        Uses invalid event_data to trigger SpiceDB failure.
        """
        # Create item with INVALID event_data (missing required fields)
        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},  # Missing organization_id, owner_id - will fail SpiceDB sync
            status=AuthSyncStatus.PENDING,
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)

        # Process batch (will fail due to invalid data)
        stats = await outbox_processor.process_batch(limit=10)

        # Verify stats show failure
        assert stats["processed_count"] == 1
        assert stats["success_count"] == 0
        assert stats["failed_count"] == 1
        assert stats["dead_letter_count"] == 0

        # Verify REAL database state changed
        result = await db_session.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.id == item.id)
        )
        updated_item = result.scalar_one()

        # Assert on actual database columns after failure
        assert updated_item.status == AuthSyncStatus.FAILED
        assert updated_item.retry_count == 1  # Incremented from 0
        assert updated_item.next_retry_at is not None
        assert updated_item.next_retry_at > datetime.now(UTC)
        assert updated_item.last_error is not None

    async def test_exponential_backoff_schedule(self, outbox_processor, db_session):
        """Test exponential backoff schedule in REAL database: 1m, 5m, 15m, 1h, 4h.

        Verifies retry_count and next_retry_at columns are correctly updated.
        Uses invalid data to trigger consistent failures.
        """
        # Create item with invalid data (will fail consistently)
        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},  # Invalid - missing required fields
            status=AuthSyncStatus.PENDING,
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)

        expected_delays = [1, 5, 15, 60, 240]  # Minutes

        for retry_num, expected_delay in enumerate(expected_delays, start=1):
            # Process batch (will fail and schedule retry)
            await outbox_processor.process_batch(limit=10)

            # Query REAL database state
            result = await db_session.execute(
                select(AuthSyncOutbox).where(AuthSyncOutbox.id == item.id)
            )
            updated_item = result.scalar_one()

            # Verify retry_count incremented in database
            assert updated_item.retry_count == retry_num

            if retry_num < 5:  # Not yet at max retries
                # Verify next_retry_at calculated correctly
                assert updated_item.next_retry_at is not None
                expected_time = datetime.now(UTC) + timedelta(minutes=expected_delay)
                # Allow 5 second tolerance for test execution time
                assert abs((updated_item.next_retry_at - expected_time).total_seconds()) < 5

                # Update database to make item processable for next iteration
                updated_item.next_retry_at = datetime.now(UTC) - timedelta(minutes=1)
                updated_item.status = AuthSyncStatus.FAILED
                await db_session.commit()

    async def test_dead_letter_queue_after_max_retries(self, outbox_processor, db_session):
        """Test items move to dead letter queue in REAL database after max retries (5)."""
        # Create item with invalid data (will fail consistently)
        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},  # Invalid - will keep failing
            status=AuthSyncStatus.PENDING,
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)

        # Process 5 times (max retries)
        for _ in range(5):
            await outbox_processor.process_batch(limit=10)

            # Make item processable for next retry
            result = await db_session.execute(
                select(AuthSyncOutbox).where(AuthSyncOutbox.id == item.id)
            )
            updated_item = result.scalar_one()
            updated_item.next_retry_at = datetime.now(UTC) - timedelta(minutes=1)
            updated_item.status = AuthSyncStatus.FAILED
            await db_session.commit()

        # One more process should move to dead letter
        stats = await outbox_processor.process_batch(limit=10)

        assert stats["dead_letter_count"] == 1

        # Verify REAL database state changed to dead letter
        result = await db_session.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.id == item.id)
        )
        final_item = result.scalar_one()

        assert final_item.status == AuthSyncStatus.DEAD_LETTER
        # retry_count is checked before incrementing, so it's 5 (matches max_retries)
        assert final_item.retry_count == 5

    async def test_process_batch_with_event_type_filter(
        self, outbox_processor, db_session, test_resource_ids, spicedb_service
    ):
        """Test event type filtering affects REAL database query results."""
        # Create items with different event types in REAL database
        org_id = test_resource_ids("org")
        owner_id = test_resource_ids("user")
        space_id = test_resource_ids("space")

        org_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={
                "organization_id": org_id,
                "owner_id": owner_id,
                "name": "Test Org",
            },
            status=AuthSyncStatus.PENDING,
        )
        space_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.SPACE_CREATED,
            table_name="spaces",
            record_id=uuid4(),
            event_data={
                "space_id": space_id,
                "organization_id": org_id,
                "owner_id": owner_id,
                "name": "Test Space",
            },
            status=AuthSyncStatus.PENDING,
        )
        db_session.add_all([org_item, space_item])
        await db_session.commit()

        # Process only organization events
        stats = await outbox_processor.process_batch(
            limit=10, event_types=[AuthSyncEventType.ORGANIZATION_CREATED]
        )

        # Should only process org event
        assert stats["processed_count"] == 1
        assert stats["success_count"] == 1

        # Verify REAL database to verify selective processing
        result = await db_session.execute(select(AuthSyncOutbox))
        items = list(result.scalars().all())

        org_processed = [i for i in items if i.event_type == AuthSyncEventType.ORGANIZATION_CREATED]
        space_processed = [i for i in items if i.event_type == AuthSyncEventType.SPACE_CREATED]

        # Org item processed, space item untouched
        assert org_processed[0].status == AuthSyncStatus.COMPLETED
        assert space_processed[0].status == AuthSyncStatus.PENDING

    async def test_get_stats(self, outbox_processor, db_session):
        """Test statistics retrieval queries REAL database counts."""
        # Create items with different statuses in REAL database
        now = datetime.now(UTC)

        pending_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.PENDING,
            created_at=now - timedelta(hours=2),
        )
        processing_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.SPACE_CREATED,
            table_name="spaces",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.PROCESSING,
        )
        completed_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_MEMBER_ADDED,
            table_name="organization_members",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.COMPLETED,
            processed_at=now - timedelta(hours=1),
        )
        failed_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.SPACE_DELETED,
            table_name="spaces",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.FAILED,
            retry_count=2,
        )
        dead_letter_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.DOCUMENT_DELETED,
            table_name="documents",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.DEAD_LETTER,
            retry_count=5,
        )

        db_session.add_all([
            pending_item,
            processing_item,
            completed_item,
            failed_item,
            dead_letter_item,
        ])
        await db_session.commit()

        # Get stats (queries REAL database)
        stats = await outbox_processor.get_stats()

        # Verify REAL database counts
        assert stats.pending_count == 1
        assert stats.processing_count == 1
        assert stats.completed_count == 1  # Within last 24 hours
        assert stats.failed_count == 1
        assert stats.dead_letter_count == 1

        # Verify oldest/newest pending timestamps
        assert stats.oldest_pending == pending_item.created_at
        assert stats.newest_pending == pending_item.created_at

    async def test_reprocess_dead_letters(self, outbox_processor, db_session):
        """Test reprocessing updates REAL database status from dead_letter to pending."""
        # Create dead letter items in REAL database
        item1 = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.DEAD_LETTER,
            retry_count=5,
            last_error="Max retries exceeded",
        )
        item2 = AuthSyncOutbox(
            event_type=AuthSyncEventType.SPACE_CREATED,
            table_name="spaces",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.DEAD_LETTER,
            retry_count=5,
        )
        db_session.add_all([item1, item2])
        await db_session.commit()

        # Reprocess all dead letters (updates REAL database)
        count = await outbox_processor.reprocess_dead_letters()

        assert count == 2

        # Verify REAL database state reset
        result = await db_session.execute(select(AuthSyncOutbox))
        items = list(result.scalars().all())

        for item in items:
            assert item.status == AuthSyncStatus.PENDING
            assert item.retry_count == 0
            assert item.last_error is None
            assert item.next_retry_at is None

    async def test_reprocess_specific_dead_letters(self, outbox_processor, db_session):
        """Test selective reprocessing updates REAL database for specific IDs only."""
        # Create dead letter items in REAL database
        item1 = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.DEAD_LETTER,
            retry_count=5,
        )
        item2 = AuthSyncOutbox(
            event_type=AuthSyncEventType.SPACE_CREATED,
            table_name="spaces",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.DEAD_LETTER,
            retry_count=5,
        )
        db_session.add_all([item1, item2])
        await db_session.commit()
        await db_session.refresh(item1)
        await db_session.refresh(item2)

        # Reprocess only item1
        count = await outbox_processor.reprocess_dead_letters(item_ids=[item1.id])

        assert count == 1

        # Verify REAL database to verify selective reset
        result = await db_session.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.id == item1.id)
        )
        item1_updated = result.scalar_one()
        assert item1_updated.status == AuthSyncStatus.PENDING

        result = await db_session.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.id == item2.id)
        )
        item2_updated = result.scalar_one()
        assert item2_updated.status == AuthSyncStatus.DEAD_LETTER  # Unchanged

    async def test_idempotency_skip_completed(self, outbox_processor, db_session):
        """Test idempotency - processor skips completed items in REAL database."""
        # Create completed item in REAL database
        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.COMPLETED,
            processed_at=datetime.now(UTC),
        )
        db_session.add(item)
        await db_session.commit()

        # Try to process (should skip via database query)
        stats = await outbox_processor.process_batch(limit=10)

        # Verify REAL database query filtered out completed items
        assert stats["processed_count"] == 0
        assert stats["success_count"] == 0


@pytest.mark.asyncio
class TestOutboxAdminEndpoints:
    """Test admin HTTP endpoints for outbox management.

    Philosophy: Test real HTTP responses and database queries.
    """

    async def test_get_outbox_stats_endpoint(self, async_client, db_session):
        """Test GET /admin/outbox/stats returns REAL database counts."""
        # Create sample items in REAL database
        pending_item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.PENDING,
        )
        db_session.add(pending_item)
        await db_session.commit()

        # Override get_session dependency to use test database
        async def override_get_session():
            yield db_session

        app.dependency_overrides[get_session] = override_get_session

        try:
            # Call endpoint (queries REAL database)
            response = await async_client.get("/admin/outbox/stats")

            assert response.status_code == 200
            data = response.json()

            # Verify response contains REAL database counts
            assert "pending_count" in data
            assert "processing_count" in data
            assert "completed_count" in data
            assert "failed_count" in data
            assert "dead_letter_count" in data
            assert data["pending_count"] == 1
        finally:
            # Cleanup: clear dependency overrides
            app.dependency_overrides.clear()


@pytest.mark.asyncio
class TestOutboxWebhook:
    """Test webhook endpoint for pg_net events.

    Philosophy: Test real HTTP authentication, database updates, AND SpiceDB sync.
    """

    @pytest.fixture
    async def _cleanup_dependency_overrides(self):
        """Cleanup fixture to ensure dependency overrides are cleared."""
        yield
        app.dependency_overrides.clear()

    @pytest.mark.usefixtures("_cleanup_dependency_overrides")
    async def test_webhook_authentication_success(
        self, async_client, db_session, test_resource_ids, spicedb_service
    ):
        """Test webhook endpoint processes events and updates REAL database AND SpiceDB."""
        # Create pending outbox item in REAL database with valid data
        org_id = test_resource_ids("org")
        owner_id = test_resource_ids("user")

        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={
                "organization_id": org_id,
                "owner_id": owner_id,
                "name": "Test Organization",
            },
            status=AuthSyncStatus.PENDING,
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)

        # Override get_session to use test database
        async def override_get_session():
            yield db_session

        app.dependency_overrides[get_session] = override_get_session

        # Call webhook with valid auth (uses REAL SpiceDB service)
        response = await async_client.post(
            "/webhooks/spicedb-sync",
            json={
                "event_id": str(item.id),
                "event_type": "organization_created",
                "table_name": "organizations",
                "record_id": str(item.record_id),
            },
            headers={"Authorization": f"Bearer {settings.supabase_service_role_key}"},
        )

        # Verify REAL HTTP response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

        # Verify REAL database state changed
        await db_session.refresh(item)
        assert item.status == AuthSyncStatus.COMPLETED
        assert item.processed_at is not None

        # Verify REAL SpiceDB relationship created
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="manage_settings",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        assert has_permission is True

    @pytest.mark.usefixtures("_cleanup_dependency_overrides")
    async def test_webhook_authentication_failure(self, async_client):
        """Test webhook rejects invalid tokens with 403."""
        # Send invalid token (not the real service role key)
        response = await async_client.post(
            "/webhooks/spicedb-sync",
            json={
                "event_id": str(uuid4()),
                "event_type": "organization_created",
                "table_name": "organizations",
                "record_id": str(uuid4()),
            },
            headers={"Authorization": "Bearer invalid-token-that-will-fail-auth"},
        )

        # Verify REAL HTTP authentication failure
        assert response.status_code == 403
        assert "Invalid webhook token" in response.json()["detail"]

    @pytest.mark.usefixtures("_cleanup_dependency_overrides")
    async def test_webhook_missing_auth_header(self, async_client):
        """Test webhook requires Authorization header."""
        response = await async_client.post(
            "/webhooks/spicedb-sync",
            json={
                "event_id": str(uuid4()),
                "event_type": "organization_created",
                "table_name": "organizations",
                "record_id": str(uuid4()),
            },
        )

        # Verify REAL HTTP authentication requirement
        assert response.status_code == 401
        assert "Missing or invalid Authorization header" in response.json()["detail"]

    @pytest.mark.usefixtures("_cleanup_dependency_overrides")
    async def test_webhook_idempotency_completed(self, async_client, db_session):
        """Test webhook idempotency for already completed items in REAL database."""
        # Create completed item in REAL database
        item = AuthSyncOutbox(
            event_type=AuthSyncEventType.ORGANIZATION_CREATED,
            table_name="organizations",
            record_id=uuid4(),
            event_data={},
            status=AuthSyncStatus.COMPLETED,
            processed_at=datetime.now(UTC),
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)

        # Override get_session
        async def override_get_session():
            yield db_session

        app.dependency_overrides[get_session] = override_get_session

        # Call webhook (use real service role key)
        response = await async_client.post(
            "/webhooks/spicedb-sync",
            json={
                "event_id": str(item.id),
                "event_type": "organization_created",
                "table_name": "organizations",
                "record_id": str(item.record_id),
            },
            headers={"Authorization": f"Bearer {settings.supabase_service_role_key}"},
        )

        # Verify REAL idempotency check via database query
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "already_processed"
