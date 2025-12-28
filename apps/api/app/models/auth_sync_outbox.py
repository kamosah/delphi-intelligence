"""Auth sync outbox model for reliable SpiceDB synchronization."""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuthSyncOutbox(Base):
    """Outbox table for reliable authorization event synchronization to SpiceDB.

    This table implements the transactional outbox pattern to ensure at-least-once
    delivery of authorization events from PostgreSQL to SpiceDB.
    """

    __tablename__ = "auth_sync_outbox"

    # id, created_at, updated_at inherited from Base
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    event_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="pending")
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, server_default="5")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_retry_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
