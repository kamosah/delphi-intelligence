"""Outbox processor service for reliable SpiceDB synchronization.

This module handles batch processing of auth_sync_outbox events with:
- Exponential backoff retry logic
- Dead letter queue management
- Idempotency guarantees
- Statistics tracking
"""

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuthSyncOutbox
from app.schemas.outbox import AuthSyncEventType, AuthSyncStatus, OutboxStatsResponse
from app.services.spicedb_service import get_spicedb_service

logger = logging.getLogger(__name__)


class OutboxProcessor:
    """Processes auth sync outbox events with retry and dead letter handling."""

    def __init__(self, db: AsyncSession):
        """Initialize outbox processor.

        Args:
            db: Database session for outbox operations
        """
        self.db = db
        self.spicedb = get_spicedb_service()

    async def process_batch(
        self,
        limit: int = 100,
        event_types: list[AuthSyncEventType] | None = None,
    ) -> dict[str, int]:
        """Process a batch of pending outbox items.

        Args:
            limit: Maximum number of items to process
            event_types: Optional filter for specific event types

        Returns:
            Dictionary with processing statistics:
            - processed_count: Total items processed
            - success_count: Successfully synced items
            - failed_count: Items that failed (will retry)
            - dead_letter_count: Items moved to dead letter queue
        """
        logger.info(f"Starting batch processing (limit={limit}, event_types={event_types})")

        stats = {
            "processed_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "dead_letter_count": 0,
        }

        # Fetch pending items or failed items ready for retry
        items = await self._fetch_processable_items(limit, event_types)
        stats["processed_count"] = len(items)

        if not items:
            logger.info("No pending items to process")
            return stats

        logger.info(f"Processing {len(items)} outbox items")

        for item in items:
            success = await self.process_item(item)

            if success:
                stats["success_count"] += 1
            # Check BEFORE incrementing - clearer logic
            elif item.retry_count >= item.max_retries:
                await self._move_to_dead_letter(item)
                stats["dead_letter_count"] += 1
            else:
                await self._increment_and_schedule_retry(item)
                stats["failed_count"] += 1

        logger.info(f"Batch processing complete: {stats}")
        return stats

    async def _fetch_processable_items(
        self,
        limit: int,
        event_types: list[AuthSyncEventType] | None = None,
    ) -> list[AuthSyncOutbox]:
        """Fetch items that are ready to process.

        Items are processable if:
        1. Status is 'pending', OR
        2. Status is 'failed' AND next_retry_at is in the past

        Args:
            limit: Maximum number of items to fetch
            event_types: Optional filter for specific event types

        Returns:
            List of outbox items to process
        """
        query = select(AuthSyncOutbox).where(
            and_(
                AuthSyncOutbox.status.in_([AuthSyncStatus.PENDING, AuthSyncStatus.FAILED]),
                # Include failed items that are ready for retry
                (
                    (AuthSyncOutbox.status == AuthSyncStatus.PENDING)
                    | (
                        (AuthSyncOutbox.status == AuthSyncStatus.FAILED)
                        & (AuthSyncOutbox.next_retry_at <= datetime.now(UTC))
                    )
                ),
            )
        )

        if event_types:
            query = query.where(AuthSyncOutbox.event_type.in_(event_types))

        query = query.order_by(AuthSyncOutbox.created_at).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def process_item(self, item: AuthSyncOutbox) -> bool:
        """Process a single outbox item.

        Args:
            item: Outbox item to process

        Returns:
            True if successfully synced, False otherwise
        """
        logger.info(f"Processing outbox item {item.id} (type={item.event_type})")

        # Mark as processing
        await self.db.execute(
            update(AuthSyncOutbox)
            .where(AuthSyncOutbox.id == item.id)
            .values(status=AuthSyncStatus.PROCESSING, updated_at=datetime.now(UTC))
        )
        await self.db.commit()

        try:
            # Process event via SpiceDB service
            success = await self.spicedb.process_outbox_event(
                event_type=item.event_type, event_data=item.event_data
            )

            if success:
                # Mark as completed
                await self.db.execute(
                    update(AuthSyncOutbox)
                    .where(AuthSyncOutbox.id == item.id)
                    .values(
                        status=AuthSyncStatus.COMPLETED,
                        processed_at=datetime.now(UTC),
                        updated_at=datetime.now(UTC),
                        last_error=None,
                    )
                )
                await self.db.commit()
                logger.info(f"Successfully processed outbox item {item.id}")
                return True
            # Sync failed - will retry
            error_msg = "SpiceDB sync returned False"
            await self._record_failure(item, error_msg)
            return False

        except Exception as e:
            logger.exception(f"Failed to process outbox item {item.id}: {e}")
            await self._record_failure(item, str(e))
            return False

    async def _record_failure(self, item: AuthSyncOutbox, error_msg: str) -> None:
        """Record a processing failure without incrementing retry count.

        The retry count is incremented separately when scheduling the retry,
        allowing us to check retry limits before incrementing.

        Args:
            item: Outbox item that failed
            error_msg: Error message to record
        """
        await self.db.execute(
            update(AuthSyncOutbox)
            .where(AuthSyncOutbox.id == item.id)
            .values(
                status=AuthSyncStatus.FAILED,
                last_error=error_msg,
                updated_at=datetime.now(UTC),
            )
        )
        await self.db.commit()

    async def _increment_and_schedule_retry(self, item: AuthSyncOutbox) -> None:
        """Increment retry count and schedule next retry with exponential backoff.

        Retry schedule:
        - Retry 1: 1 minute
        - Retry 2: 5 minutes
        - Retry 3: 15 minutes
        - Retry 4: 1 hour
        - Retry 5: 4 hours

        Args:
            item: Outbox item to schedule retry for
        """
        backoff_minutes = [1, 5, 15, 60, 240]  # Exponential backoff schedule
        # retry_count is 0-indexed (0 for first retry), array is 0-indexed
        retry_index = min(item.retry_count, len(backoff_minutes) - 1)
        delay_minutes = backoff_minutes[retry_index]
        next_retry_at = datetime.now(UTC) + timedelta(minutes=delay_minutes)

        new_retry_count = item.retry_count + 1

        await self.db.execute(
            update(AuthSyncOutbox)
            .where(AuthSyncOutbox.id == item.id)
            .values(
                retry_count=new_retry_count,
                next_retry_at=next_retry_at,
                updated_at=datetime.now(UTC),
            )
        )
        await self.db.commit()

        # Update in-memory object to stay in sync with database
        item.retry_count = new_retry_count

        logger.info(
            f"Scheduled retry for outbox item {item.id} at {next_retry_at} "
            f"(attempt {new_retry_count}/{item.max_retries})"
        )

    async def _move_to_dead_letter(self, item: AuthSyncOutbox) -> None:
        """Move item to dead letter queue after max retries exceeded.

        Args:
            item: Outbox item to move to dead letter queue
        """
        await self.db.execute(
            update(AuthSyncOutbox)
            .where(AuthSyncOutbox.id == item.id)
            .values(status=AuthSyncStatus.DEAD_LETTER, updated_at=datetime.now(UTC))
        )
        await self.db.commit()

        logger.warning(
            f"Moved outbox item {item.id} to dead letter queue after "
            f"{item.retry_count} failed attempts (max_retries={item.max_retries})"
        )

    async def get_stats(self) -> OutboxStatsResponse:
        """Get statistics about outbox items.

        Returns:
            Statistics including counts by status and oldest/newest pending items
        """
        # Count by status
        pending_result = await self.db.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.status == AuthSyncStatus.PENDING)
        )
        pending_count = len(list(pending_result.scalars().all()))

        processing_result = await self.db.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.status == AuthSyncStatus.PROCESSING)
        )
        processing_count = len(list(processing_result.scalars().all()))

        # Completed in last 24 hours
        completed_since = datetime.now(UTC) - timedelta(hours=24)
        completed_result = await self.db.execute(
            select(AuthSyncOutbox).where(
                and_(
                    AuthSyncOutbox.status == AuthSyncStatus.COMPLETED,
                    AuthSyncOutbox.processed_at >= completed_since,
                )
            )
        )
        completed_count = len(list(completed_result.scalars().all()))

        failed_result = await self.db.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.status == AuthSyncStatus.FAILED)
        )
        failed_count = len(list(failed_result.scalars().all()))

        dead_letter_result = await self.db.execute(
            select(AuthSyncOutbox).where(AuthSyncOutbox.status == AuthSyncStatus.DEAD_LETTER)
        )
        dead_letter_count = len(list(dead_letter_result.scalars().all()))

        # Oldest and newest pending
        oldest_pending_result = await self.db.execute(
            select(AuthSyncOutbox)
            .where(AuthSyncOutbox.status == AuthSyncStatus.PENDING)
            .order_by(AuthSyncOutbox.created_at)
            .limit(1)
        )
        oldest_pending_item = oldest_pending_result.scalar_one_or_none()
        oldest_pending = oldest_pending_item.created_at if oldest_pending_item else None

        newest_pending_result = await self.db.execute(
            select(AuthSyncOutbox)
            .where(AuthSyncOutbox.status == AuthSyncStatus.PENDING)
            .order_by(AuthSyncOutbox.created_at.desc())
            .limit(1)
        )
        newest_pending_item = newest_pending_result.scalar_one_or_none()
        newest_pending = newest_pending_item.created_at if newest_pending_item else None

        return OutboxStatsResponse(
            pending_count=pending_count,
            processing_count=processing_count,
            completed_count=completed_count,
            failed_count=failed_count,
            dead_letter_count=dead_letter_count,
            oldest_pending=oldest_pending,
            newest_pending=newest_pending,
        )

    async def reprocess_dead_letters(self, item_ids: list[UUID] | None = None) -> int:
        """Reprocess items from dead letter queue.

        Args:
            item_ids: Optional list of specific item IDs to reprocess.
                     If None, reprocess all dead letter items.

        Returns:
            Number of items moved back to pending status
        """
        query = update(AuthSyncOutbox).where(AuthSyncOutbox.status == AuthSyncStatus.DEAD_LETTER)

        if item_ids:
            query = query.where(AuthSyncOutbox.id.in_(item_ids))

        query = query.values(
            status=AuthSyncStatus.PENDING,
            retry_count=0,
            last_error=None,
            next_retry_at=None,
            updated_at=datetime.now(UTC),
        )

        result = await self.db.execute(query)
        await self.db.commit()

        count = result.rowcount
        logger.info(f"Reprocessed {count} items from dead letter queue")
        return count
