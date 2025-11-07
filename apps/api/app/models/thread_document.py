"""ThreadDocument association model for tracking which documents were used in threads."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document
    from .thread import Thread


class ThreadDocument(Base):
    """Association table tracking which documents were used in thread responses."""

    __tablename__ = "thread_documents"

    # Foreign keys
    thread_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True
    )

    document_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True
    )

    # Relevance score for this document in the thread context
    relevance_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)

    # Relationships
    thread: Mapped["Thread"] = relationship("Thread", back_populates="thread_documents")

    document: Mapped["Document"] = relationship("Document", back_populates="thread_documents")

    def __repr__(self) -> str:
        """String representation of the thread-document association."""
        score = f", relevance={self.relevance_score:.3f}" if self.relevance_score else ""
        return (
            f"<ThreadDocument(thread_id={self.thread_id}, document_id={self.document_id}{score})>"
        )
