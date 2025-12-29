"""Thread model for storing AI agent conversations and results."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .message import Message
    from .organization import Organization
    from .space import Space
    from .thread_document import ThreadDocument
    from .user import User


class ThreadStatus(StrEnum):
    """Thread processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ThreadVisibility(StrEnum):
    """Thread visibility scope for access control.

    Visibility levels determine who can access a thread:

    - PERSONAL: Private threads owned by a single user. No organization or space context.
      Use for: User's personal analysis, drafts, private notes.
      Access: Only the owner can read/write.

    - SPACE: Threads shared within a specific space (team workspace).
      Use for: Team collaboration, project-specific threads, shared analysis.
      Access: All space members can read; permissions controlled by space membership.

    - ORGANIZATION: Threads shared across the entire organization.
      Use for: Company-wide announcements, shared resources, cross-team collaboration.
      Access: All organization members can read; no space restriction.
    """

    PERSONAL = "personal"  # Only owner can access
    SPACE = "space"  # Space members can access
    ORGANIZATION = "organization"  # All org members can access


class Thread(Base):
    """
    Thread model for storing AI agent conversations and their results.

    Stores the complete RAG pipeline output including:
    - User query text
    - Generated response
    - Source citations with metadata
    - Confidence scoring
    - Agent reasoning steps
    """

    __tablename__ = "threads"

    # Owner (REQUIRED) - threads always belong to a user
    owner_user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Organization context (NULLABLE) - personal threads have no org
    organization_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Space context (NULLABLE) - for space-scoped threads
    space_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=True, index=True
    )

    # Creator (kept for backwards compatibility, will be deprecated)
    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Visibility level (determines access rules)
    visibility: Mapped[ThreadVisibility] = mapped_column(
        SQLEnum(
            ThreadVisibility,
            name="thread_visibility",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ThreadVisibility.PERSONAL,
        server_default="personal",
        index=True,
    )

    # Core thread fields
    query_text: Mapped[str] = mapped_column(Text, nullable=False)

    result: Mapped[str | None] = mapped_column(Text, nullable=True)

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # User preferences
    is_starred: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false", index=True
    )

    # RAG pipeline fields
    context: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Confidence score for the response (0.0-1.0)
    # Based on similarity scores, citation quality, and coverage
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Agent reasoning steps and intermediate state
    # Stores LangGraph agent state transitions for debugging
    agent_steps: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Source citations with rich metadata
    # Structure: {"citations": [{"index": 1, "document_title": "...", ...}], "count": N}
    sources: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Metadata fields
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Status using thread_status enum
    status: Mapped[ThreadStatus | None] = mapped_column(
        SQLEnum(ThreadStatus, name="thread_status", values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        default=ThreadStatus.PENDING,
    )

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)

    cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Table constraints
    # Note: Check constraints are defined in the migration (60e29a1ed846_add_thread_ownership_model.py)
    # to ensure proper data backfill before constraint enforcement
    __table_args__ = ()

    # Relationships
    organization: Mapped["Organization | None"] = relationship(
        "Organization", back_populates="threads"
    )

    space: Mapped["Space | None"] = relationship("Space", back_populates="threads")

    # Owner relationship (new ownership model)
    owner: Mapped["User"] = relationship(
        "User", foreign_keys=[owner_user_id], back_populates="owned_threads"
    )

    # Creator relationship (legacy, kept for backwards compatibility)
    creator: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by], back_populates="created_threads"
    )

    thread_documents: Mapped[list["ThreadDocument"]] = relationship(
        "ThreadDocument",
        back_populates="thread",
        cascade="all, delete-orphan",
        lazy="selectin",  # Async-safe eager loading
    )

    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
        lazy="selectin",  # Async-safe eager loading
    )

    def __repr__(self) -> str:
        """String representation of the thread."""
        confidence = f", confidence={self.confidence_score:.2f}" if self.confidence_score else ""
        query_preview = self.query_text[:50] if len(self.query_text) > 50 else self.query_text
        return f"<Thread(id={self.id}, query_text={query_preview}...{confidence})>"
