"""Thread model for storing AI agent conversations and results."""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .organization import Organization
    from .space import Space
    from .thread_document import ThreadDocument
    from .user import User


class ThreadStatus(str, PyEnum):
    """Thread processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


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

    # Organization-level scoping (required)
    organization_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Space-level scoping (optional - for backwards compat and space-specific threads)
    space_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=True, index=True
    )

    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Core thread fields
    query_text: Mapped[str] = mapped_column(Text, nullable=False)

    result: Mapped[str | None] = mapped_column(Text, nullable=True)

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)

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

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="threads")

    space: Mapped["Space | None"] = relationship("Space", back_populates="threads")

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])

    thread_documents: Mapped[list["ThreadDocument"]] = relationship(
        "ThreadDocument", back_populates="thread", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of the thread."""
        confidence = f", confidence={self.confidence_score:.2f}" if self.confidence_score else ""
        query_preview = self.query_text[:50] if len(self.query_text) > 50 else self.query_text
        return f"<Thread(id={self.id}, query_text={query_preview}...{confidence})>"
