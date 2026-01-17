"""
Unit tests for thread creation, updates, and deletion.

Tests thread lifecycle operations including visibility rules, ownership,
and persistence using real database operations.

Following TESTING.md principles:
- Uses real in-memory SQLite database (not mocks)
- Uses factory functions from tests/factories.py
- Tests actual database operations and business logic
- Follows AAA pattern (Arrange-Act-Assert)
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.space import Space
from app.models.thread import Thread, ThreadStatus, ThreadVisibility
from tests.factories import (
    create_space,
    create_thread,
    create_user_with_org,
)


@pytest.mark.asyncio()
class TestThreadCreation:
    """Tests for thread creation with different visibility settings."""

    async def test_create_personal_thread(self, db_session: AsyncSession) -> None:
        """Test creating a personal thread with no organization or space."""
        # Arrange: Create user
        user, _org, _ = await create_user_with_org(db_session)

        # Act: Create personal thread
        thread = await create_thread(
            db_session,
            query_text="Personal query",
            title="Personal Thread",
            visibility=ThreadVisibility.PERSONAL,
            creator=user,
        )
        await db_session.commit()

        # Assert: Thread created with correct visibility and ownership
        assert thread.id is not None
        assert thread.visibility == ThreadVisibility.PERSONAL
        assert thread.owner_user_id == user.id
        assert thread.created_by == user.id
        assert thread.organization_id is None
        assert thread.space_id is None
        assert thread.query_text == "Personal query"
        assert thread.title == "Personal Thread"
        assert thread.status == ThreadStatus.PENDING

    async def test_create_space_thread(self, db_session: AsyncSession) -> None:
        """Test creating a thread within a space."""
        # Arrange: Create user, organization, and space
        user, org, _ = await create_user_with_org(db_session)
        space = await create_space(
            db_session,
            name="Project Space",
            organization=org,
            owner=user,
        )
        await db_session.commit()

        # Act: Create space thread
        thread = await create_thread(
            db_session,
            query_text="Space query",
            title="Space Thread",
            visibility=ThreadVisibility.SPACE,
            organization=org,
            space=space,
            creator=user,
        )
        await db_session.commit()

        # Assert: Thread created with space and org associations
        assert thread.visibility == ThreadVisibility.SPACE
        assert thread.organization_id == org.id
        assert thread.space_id == space.id
        assert thread.owner_user_id == user.id
        assert thread.created_by == user.id

    async def test_create_organization_thread(self, db_session: AsyncSession) -> None:
        """Test creating an organization-wide thread without a specific space."""
        # Arrange: Create user and organization
        user, org, _ = await create_user_with_org(db_session)

        # Act: Create organization thread
        thread = await create_thread(
            db_session,
            query_text="Org-wide query",
            title="Organization Thread",
            visibility=ThreadVisibility.ORGANIZATION,
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Assert: Thread created with org association but no space
        assert thread.visibility == ThreadVisibility.ORGANIZATION
        assert thread.organization_id == org.id
        assert thread.space_id is None
        assert thread.owner_user_id == user.id

    async def test_thread_creator_and_owner_set_correctly(self, db_session: AsyncSession) -> None:
        """Test that thread creator and owner are set correctly on creation."""
        # Arrange: Create user
        user, org, _ = await create_user_with_org(db_session)

        # Act: Create thread
        thread = await create_thread(
            db_session,
            query_text="Test ownership",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Assert: Both creator and owner fields set to same user
        assert thread.created_by == user.id
        assert thread.owner_user_id == user.id


@pytest.mark.asyncio()
class TestThreadUpdates:
    """Tests for updating thread properties."""

    async def test_update_thread_title(self, db_session: AsyncSession) -> None:
        """Test updating a thread's title."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Test query",
            title="Original Title",
            organization=org,
            creator=user,
        )
        await db_session.commit()
        original_id = thread.id

        # Act: Update title
        thread.title = "Updated Title"
        await db_session.commit()

        # Assert: Title updated, other fields unchanged
        result = await db_session.execute(select(Thread).where(Thread.id == original_id))
        updated_thread = result.scalar_one()
        assert updated_thread.title == "Updated Title"
        assert updated_thread.query_text == "Test query"
        assert updated_thread.id == original_id

    async def test_update_thread_result(self, db_session: AsyncSession) -> None:
        """Test updating a thread's result field."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Query",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Act: Update result
        thread.result = "Completed analysis results"
        await db_session.commit()

        # Assert: Result field updated
        result = await db_session.execute(select(Thread).where(Thread.id == thread.id))
        updated_thread = result.scalar_one()
        assert updated_thread.result == "Completed analysis results"

    async def test_update_thread_status(self, db_session: AsyncSession) -> None:
        """Test updating a thread's status."""
        # Arrange: Create thread (starts as PENDING)
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Query",
            organization=org,
            creator=user,
        )
        await db_session.commit()
        assert thread.status == ThreadStatus.PENDING

        # Act: Update to PROCESSING
        thread.status = ThreadStatus.PROCESSING
        await db_session.commit()

        # Assert: Status updated
        result = await db_session.execute(select(Thread).where(Thread.id == thread.id))
        updated_thread = result.scalar_one()
        assert updated_thread.status == ThreadStatus.PROCESSING

        # Act: Update to COMPLETED
        thread.status = ThreadStatus.COMPLETED
        await db_session.commit()

        # Assert: Status updated again
        result = await db_session.execute(select(Thread).where(Thread.id == thread.id))
        final_thread = result.scalar_one()
        assert final_thread.status == ThreadStatus.COMPLETED


@pytest.mark.asyncio()
class TestThreadDeletion:
    """Tests for thread deletion and cascade behavior."""

    async def test_delete_thread(self, db_session: AsyncSession) -> None:
        """Test deleting a thread removes it from database."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Query to delete",
            organization=org,
            creator=user,
        )
        await db_session.commit()
        thread_id = thread.id

        # Act: Delete thread
        await db_session.delete(thread)
        await db_session.commit()

        # Assert: Thread no longer exists
        result = await db_session.execute(select(Thread).where(Thread.id == thread_id))
        deleted_thread = result.scalar_one_or_none()
        assert deleted_thread is None

    async def test_delete_personal_thread(self, db_session: AsyncSession) -> None:
        """Test deleting a personal thread."""
        # Arrange: Create personal thread
        user, _org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Personal query",
            visibility=ThreadVisibility.PERSONAL,
            creator=user,
        )
        await db_session.commit()
        thread_id = thread.id

        # Act: Delete thread
        await db_session.delete(thread)
        await db_session.commit()

        # Assert: Thread deleted
        result = await db_session.execute(select(Thread).where(Thread.id == thread_id))
        assert result.scalar_one_or_none() is None

    async def test_delete_space_thread(self, db_session: AsyncSession) -> None:
        """Test deleting a space thread."""
        # Arrange: Create space thread
        user, org, _ = await create_user_with_org(db_session)
        space = await create_space(
            db_session,
            name="Test Space",
            organization=org,
            owner=user,
        )
        thread = await create_thread(
            db_session,
            query_text="Space query",
            visibility=ThreadVisibility.SPACE,
            organization=org,
            space=space,
            creator=user,
        )
        await db_session.commit()
        thread_id = thread.id

        # Act: Delete thread
        await db_session.delete(thread)
        await db_session.commit()

        # Assert: Thread deleted, space still exists
        result = await db_session.execute(select(Thread).where(Thread.id == thread_id))
        assert result.scalar_one_or_none() is None

        # Space should still exist
        space_result = await db_session.execute(select(Space).where(Space.id == space.id))
        assert space_result.scalar_one_or_none() is not None


@pytest.mark.asyncio()
class TestThreadVisibilityRules:
    """Tests for thread visibility constraints and relationships."""

    async def test_personal_thread_has_no_org_or_space(self, db_session: AsyncSession) -> None:
        """Test that personal threads have null organization and space."""
        # Arrange & Act: Create personal thread
        user, _org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Personal query",
            visibility=ThreadVisibility.PERSONAL,
            creator=user,
        )
        await db_session.commit()

        # Assert: No org or space associations
        assert thread.organization_id is None
        assert thread.space_id is None
        assert thread.visibility == ThreadVisibility.PERSONAL

    async def test_space_thread_requires_space_and_org(self, db_session: AsyncSession) -> None:
        """Test that space threads have both space_id and organization_id."""
        # Arrange: Create space thread
        user, org, _ = await create_user_with_org(db_session)
        space = await create_space(
            db_session,
            name="Test Space",
            organization=org,
            owner=user,
        )
        thread = await create_thread(
            db_session,
            query_text="Space query",
            visibility=ThreadVisibility.SPACE,
            organization=org,
            space=space,
            creator=user,
        )
        await db_session.commit()

        # Assert: Both associations present
        assert thread.space_id is not None
        assert thread.organization_id is not None
        assert thread.space_id == space.id
        assert thread.organization_id == org.id

    async def test_organization_thread_has_org_no_space(self, db_session: AsyncSession) -> None:
        """Test that organization threads have organization_id but no space_id."""
        # Arrange & Act: Create organization thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Org query",
            visibility=ThreadVisibility.ORGANIZATION,
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Assert: Org association but no space
        assert thread.organization_id is not None
        assert thread.space_id is None
        assert thread.organization_id == org.id


@pytest.mark.asyncio()
class TestThreadRelationships:
    """Tests for thread relationships with spaces and organizations."""

    async def test_thread_belongs_to_organization(self, db_session: AsyncSession) -> None:
        """Test thread-organization relationship."""
        # Arrange: Create thread with organization
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Org thread",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Act: Query thread and verify organization
        result = await db_session.execute(select(Thread).where(Thread.id == thread.id))
        queried_thread = result.scalar_one()

        # Assert: Thread has correct organization_id
        assert queried_thread.organization_id == org.id

    async def test_thread_belongs_to_space(self, db_session: AsyncSession) -> None:
        """Test thread-space relationship."""
        # Arrange: Create thread within space
        user, org, _ = await create_user_with_org(db_session)
        space = await create_space(
            db_session,
            name="Project Space",
            organization=org,
            owner=user,
        )
        thread = await create_thread(
            db_session,
            query_text="Space thread",
            visibility=ThreadVisibility.SPACE,
            organization=org,
            space=space,
            creator=user,
        )
        await db_session.commit()

        # Act: Query thread and verify space
        result = await db_session.execute(select(Thread).where(Thread.id == thread.id))
        queried_thread = result.scalar_one()

        # Assert: Thread has correct space_id
        assert queried_thread.space_id == space.id

    async def test_multiple_threads_in_same_space(self, db_session: AsyncSession) -> None:
        """Test that multiple threads can belong to the same space."""
        # Arrange: Create space with multiple threads
        user, org, _ = await create_user_with_org(db_session)
        space = await create_space(
            db_session,
            name="Shared Space",
            organization=org,
            owner=user,
        )

        thread1 = await create_thread(
            db_session,
            query_text="Query 1",
            visibility=ThreadVisibility.SPACE,
            organization=org,
            space=space,
            creator=user,
        )
        thread2 = await create_thread(
            db_session,
            query_text="Query 2",
            visibility=ThreadVisibility.SPACE,
            organization=org,
            space=space,
            creator=user,
        )
        await db_session.commit()

        # Act: Query threads in space
        result = await db_session.execute(select(Thread).where(Thread.space_id == space.id))
        space_threads = result.scalars().all()

        # Assert: Both threads in space
        assert len(space_threads) == 2
        thread_ids = {t.id for t in space_threads}
        assert thread1.id in thread_ids
        assert thread2.id in thread_ids


@pytest.mark.asyncio()
class TestThreadOwnership:
    """Tests for thread ownership and creator tracking."""

    async def test_thread_owner_matches_creator(self, db_session: AsyncSession) -> None:
        """Test that thread owner_user_id matches created_by on creation."""
        # Arrange: Create user and thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Test ownership",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Assert: Owner and creator are the same
        assert thread.owner_user_id == user.id
        assert thread.created_by == user.id
        assert thread.owner_user_id == thread.created_by

    async def test_different_users_own_different_threads(self, db_session: AsyncSession) -> None:
        """Test that different users can own separate threads."""
        # Arrange: Create two users with threads
        user1, org1, _ = await create_user_with_org(
            db_session, user_email="user1@test.com", org_name="Org1"
        )
        user2, org2, _ = await create_user_with_org(
            db_session, user_email="user2@test.com", org_name="Org2"
        )

        thread1 = await create_thread(
            db_session,
            query_text="User 1 thread",
            organization=org1,
            creator=user1,
        )
        thread2 = await create_thread(
            db_session,
            query_text="User 2 thread",
            organization=org2,
            creator=user2,
        )
        await db_session.commit()

        # Assert: Each user owns their own thread
        assert thread1.owner_user_id == user1.id
        assert thread2.owner_user_id == user2.id
        assert thread1.owner_user_id != thread2.owner_user_id

    async def test_query_threads_by_owner(self, db_session: AsyncSession) -> None:
        """Test querying threads by owner_user_id."""
        # Arrange: Create user with multiple threads
        user, org, _ = await create_user_with_org(db_session)
        thread1 = await create_thread(
            db_session,
            query_text="Thread 1",
            organization=org,
            creator=user,
        )
        thread2 = await create_thread(
            db_session,
            query_text="Thread 2",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Act: Query threads by owner
        result = await db_session.execute(select(Thread).where(Thread.owner_user_id == user.id))
        user_threads = result.scalars().all()

        # Assert: Both threads returned
        assert len(user_threads) == 2
        thread_ids = {t.id for t in user_threads}
        assert thread1.id in thread_ids
        assert thread2.id in thread_ids
