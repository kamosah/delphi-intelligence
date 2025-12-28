"""Webhook endpoint for receiving pg_net SpiceDB sync events."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_session
from app.models import AuthSyncOutbox
from app.schemas.outbox import AuthSyncStatus
from app.services.outbox_processor import OutboxProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class SpiceDBSyncWebhookPayload(BaseModel):
    """Payload from pg_net webhook for SpiceDB sync events."""

    event_id: UUID  # The auth_sync_outbox.id
    event_type: str  # The event type (e.g., "organization_created")
    table_name: str  # The source table (e.g., "organizations")
    record_id: UUID  # The source record ID


@router.post("/spicedb-sync")
async def spicedb_sync_webhook(
    payload: SpiceDBSyncWebhookPayload,
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Receive pg_net webhook events for SpiceDB synchronization.

    This endpoint is called by PostgreSQL pg_net extension when outbox events
    are created by database triggers. It processes the event and syncs to SpiceDB.

    Security:
    - Authenticates using Supabase service role key in Authorization header
    - Validates event exists in outbox table (idempotency)
    - Only processes pending/failed events (prevents duplicate processing)

    Args:
        payload: Webhook payload with event details
        authorization: Bearer token for authentication
        db: Database session

    Returns:
        Success message with event ID

    Raises:
        HTTPException: If authentication fails, event not found, or already processed
    """
    # Authenticate webhook request
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "")
    if token != settings.supabase_service_role_key:
        raise HTTPException(status_code=403, detail="Invalid webhook token")

    logger.info(
        f"Received SpiceDB sync webhook: event_id={payload.event_id}, "
        f"event_type={payload.event_type}"
    )

    # Fetch outbox item (idempotency check)
    result = await db.execute(select(AuthSyncOutbox).where(AuthSyncOutbox.id == payload.event_id))
    item = result.scalar_one_or_none()

    if not item:
        logger.warning(f"Outbox item {payload.event_id} not found (may have been deleted)")
        raise HTTPException(status_code=404, detail=f"Outbox item {payload.event_id} not found")

    # Idempotency: Skip if already completed
    if item.status == AuthSyncStatus.COMPLETED:
        logger.info(f"Outbox item {payload.event_id} already processed, skipping")
        return {
            "status": "already_processed",
            "message": f"Event {payload.event_id} already completed",
        }

    # Process the event
    processor = OutboxProcessor(db)
    success = await processor.process_item(item)

    if success:
        logger.info(f"Successfully processed webhook event {payload.event_id}")
        return {
            "status": "success",
            "message": f"Processed event {payload.event_id}",
        }
    logger.error(f"Failed to process webhook event {payload.event_id}")
    raise HTTPException(
        status_code=500,
        detail=f"Failed to process event {payload.event_id}. Item will be retried.",
    )
