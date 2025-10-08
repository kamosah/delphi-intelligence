"""Query model for storing AI agent queries and results."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .space import Space
    from .user import User


class Query(Base):
    """Query model for storing AI agent queries and their results."""

    __tablename__ = "queries"

    # Query fields
    space_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )

    query_text: Mapped[str] = mapped_column(Text, nullable=False)

    result: Mapped[str | None] = mapped_column(Text, nullable=True)

    agent_steps: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    sources: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="queries")

    creator: Mapped["User"] = relationship("User", back_populates="created_queries")

    def __repr__(self) -> str:
        """String representation of the query."""
        return f"<Query(id={self.id}, query_text={self.query_text[:50]}...)>"

