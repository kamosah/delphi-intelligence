"""Admin endpoints for outbox monitoring and manual intervention."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import AuthSyncOutbox
from app.schemas.outbox import (
    OutboxStatsResponse,
    ProcessOutboxBatchInput,
    ProcessOutboxBatchResponse,
    ProcessOutboxItemInput,
)
from app.services.outbox_processor import OutboxProcessor

router = APIRouter(prefix="/admin/outbox", tags=["Admin - Outbox"])


@router.get("/stats", response_model=OutboxStatsResponse)
async def get_outbox_stats(
    db: AsyncSession = Depends(get_session),
) -> OutboxStatsResponse:
    """Get statistics about outbox items.

    Returns counts by status and oldest/newest pending items for monitoring sync health.

    Returns:
        Statistics including pending, processing, completed, failed, and dead letter counts
    """
    processor = OutboxProcessor(db)
    return await processor.get_stats()


@router.post("/process", response_model=ProcessOutboxBatchResponse)
async def process_outbox_batch(
    input_data: ProcessOutboxBatchInput,
    db: AsyncSession = Depends(get_session),
) -> ProcessOutboxBatchResponse:
    """Manually trigger batch processing of outbox items.

    This endpoint is useful for:
    - Manual sync operations
    - Testing outbox processing
    - Recovering from pg_cron failures

    Args:
        input_data: Batch processing parameters (limit, event_types filter)
        db: Database session

    Returns:
        Processing statistics (processed, success, failed, dead letter counts)
    """
    processor = OutboxProcessor(db)
    stats = await processor.process_batch(
        limit=input_data.limit,
        event_types=input_data.event_types,
    )

    return ProcessOutboxBatchResponse(
        processed_count=stats["processed_count"],
        success_count=stats["success_count"],
        failed_count=stats["failed_count"],
        dead_letter_count=stats["dead_letter_count"],
    )


@router.post("/process-item")
async def process_single_item(
    input_data: ProcessOutboxItemInput,
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Process a single outbox item by ID.

    Useful for manually retrying specific failed items.

    Args:
        input_data: Item ID to process
        db: Database session

    Returns:
        Success message with item ID

    Raises:
        HTTPException: If item not found or processing fails
    """
    processor = OutboxProcessor(db)

    # Fetch the specific item
    result = await db.execute(
        select(AuthSyncOutbox).where(AuthSyncOutbox.id == input_data.event_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail=f"Outbox item {input_data.event_id} not found")

    # Process the item
    success = await processor.process_item(item)

    if success:
        return {"status": "success", "message": f"Processed outbox item {input_data.event_id}"}
    raise HTTPException(
        status_code=500,
        detail=f"Failed to process outbox item {input_data.event_id}. Check logs for details.",
    )


@router.post("/reprocess-dead-letters")
async def reprocess_dead_letters(
    item_ids: list[UUID] | None = None,
    db: AsyncSession = Depends(get_session),
) -> dict[str, int | str]:
    """Reprocess items from dead letter queue.

    Moves items back to 'pending' status and resets retry count.

    Args:
        item_ids: Optional list of specific item IDs to reprocess.
                 If None, reprocess ALL dead letter items.
        db: Database session

    Returns:
        Count of items moved back to pending status
    """
    processor = OutboxProcessor(db)
    count = await processor.reprocess_dead_letters(item_ids)

    return {
        "reprocessed_count": count,
        "message": f"Moved {count} items from dead letter queue back to pending",
    }
