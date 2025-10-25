"""QueryDocument association model for tracking which documents were used in queries."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document
    from .query import Query


class QueryDocument(Base):
    """Association table tracking which documents were used in query responses."""

    __tablename__ = "query_documents"

    # Foreign keys
    query_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("queries.id"), nullable=False, index=True
    )

    document_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True
    )

    # Relevance score for this document in the query context
    relevance_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)

    # Relationships
    query: Mapped["Query"] = relationship("Query", back_populates="query_documents")

    document: Mapped["Document"] = relationship("Document", back_populates="query_documents")

    def __repr__(self) -> str:
        """String representation of the query-document association."""
        score = f", relevance={self.relevance_score:.3f}" if self.relevance_score else ""
        return f"<QueryDocument(query_id={self.query_id}, document_id={self.document_id}{score})>"
