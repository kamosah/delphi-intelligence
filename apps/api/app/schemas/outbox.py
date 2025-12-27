"""Pydantic schemas for auth sync outbox system."""

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AuthSyncEventType(StrEnum):
    """Event types for authorization sync outbox."""

    ORGANIZATION_CREATED = "organization_created"
    ORGANIZATION_DELETED = "organization_deleted"
    ORGANIZATION_MEMBER_ADDED = "organization_member_added"
    ORGANIZATION_MEMBER_REMOVED = "organization_member_removed"
    ORGANIZATION_MEMBER_ROLE_CHANGED = "organization_member_role_changed"
    SPACE_CREATED = "space_created"
    SPACE_DELETED = "space_deleted"
    SPACE_MEMBER_ADDED = "space_member_added"
    SPACE_MEMBER_REMOVED = "space_member_removed"
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_DELETED = "document_deleted"
    INVITATION_CREATED = "invitation_created"
    INVITATION_ACCEPTED = "invitation_accepted"
    INVITATION_REVOKED = "invitation_revoked"


class AuthSyncStatus(StrEnum):
    """Status of auth sync outbox item."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"


class OutboxEvent(BaseModel):
    """Auth sync outbox event."""

    id: UUID
    event_type: AuthSyncEventType
    table_name: str
    record_id: UUID
    event_data: dict[str, Any]
    status: AuthSyncStatus
    retry_count: int = 0
    max_retries: int = 5
    last_error: str | None = None
    next_retry_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    processed_at: datetime | None = None

    class Config:
        """Pydantic config."""

        from_attributes = True


class ProcessOutboxItemInput(BaseModel):
    """Input for processing a single outbox item."""

    event_id: UUID = Field(description="The outbox event ID to process")


class OutboxStatsResponse(BaseModel):
    """Statistics about outbox items."""

    pending_count: int = Field(description="Number of pending items")
    processing_count: int = Field(description="Number of currently processing items")
    completed_count: int = Field(description="Number of completed items (last 24 hours)")
    failed_count: int = Field(description="Number of failed items awaiting retry")
    dead_letter_count: int = Field(
        description="Number of dead letter items requiring manual intervention"
    )
    oldest_pending: datetime | None = Field(description="Timestamp of oldest pending item")
    newest_pending: datetime | None = Field(description="Timestamp of newest pending item")


class ProcessOutboxBatchInput(BaseModel):
    """Input for batch processing outbox items."""

    limit: int = Field(default=100, ge=1, le=500, description="Maximum items to process")
    event_types: list[AuthSyncEventType] | None = Field(
        default=None, description="Filter by specific event types"
    )


class ProcessOutboxBatchResponse(BaseModel):
    """Response from batch processing."""

    processed_count: int = Field(description="Number of items processed")
    success_count: int = Field(description="Number of successfully synced items")
    failed_count: int = Field(description="Number of failed items")
    dead_letter_count: int = Field(description="Number of items moved to dead letter queue")
