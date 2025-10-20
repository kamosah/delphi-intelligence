"""Query model for storing AI agent queries and results."""

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .space import Space
    from .user import User


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

    # Query fields
    space_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )

    query_text: Mapped[str] = mapped_column(Text, nullable=False)

    result: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Confidence score for the response (0.0-1.0)
    # Based on similarity scores, citation quality, and coverage
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Agent reasoning steps and intermediate state
    # Stores LangGraph agent state transitions for debugging
    agent_steps: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Source citations with rich metadata
    # Structure: {"citations": [{"index": 1, "document_title": "...", ...}], "count": N}
    sources: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="queries")

    creator: Mapped["User"] = relationship("User", back_populates="created_queries")

    def __repr__(self) -> str:
        """String representation of the query."""
        confidence = f", confidence={self.confidence_score:.2f}" if self.confidence_score else ""
        return f"<Query(id={self.id}, query_text={self.query_text[:50]}...{confidence})>"
