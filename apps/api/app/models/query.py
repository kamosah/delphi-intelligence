"""Query model for storing AI agent queries and results."""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .query_document import QueryDocument
    from .space import Space
    from .user import User


class QueryStatus(str, PyEnum):
    """Query processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Query(Base):
    """
    Query model for storing AI agent queries and their results.

    Stores the complete RAG pipeline output including:
    - User query text
    - Generated response
    - Source citations with metadata
    - Confidence scoring
    - Agent reasoning steps
    """

    __tablename__ = "queries"

    # Query fields (aligned with Supabase after migration)
    space_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )

    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Core query fields
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

    # Metadata fields from Supabase
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Status using query_status enum from Supabase
    status: Mapped[QueryStatus | None] = mapped_column(
        SQLEnum(QueryStatus, name="query_status", values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        default=QueryStatus.PENDING,
    )

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)

    cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Fixed: completed_at should be DateTime not Text
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="queries")

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])

    query_documents: Mapped[list["QueryDocument"]] = relationship(
        "QueryDocument", back_populates="query", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of the query."""
        confidence = f", confidence={self.confidence_score:.2f}" if self.confidence_score else ""
        query_preview = self.query_text[:50] if len(self.query_text) > 50 else self.query_text
        return f"<Query(id={self.id}, query_text={query_preview}...{confidence})>"
