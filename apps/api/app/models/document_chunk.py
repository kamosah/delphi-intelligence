"""DocumentChunk model for storing chunked document text for vector embedding."""

from datetime import datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document


class DocumentChunk(Base):
    """Document chunk model for storing text segments ready for embedding.

    Chunks are created from extracted document text with:
    - 500-1000 token size
    - 100 token overlap between chunks
    - Sentence boundary preservation
    """

    __tablename__ = "document_chunks"

    # Document relationship
    document_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Chunk content
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Chunk position in document (0-indexed)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Token count for this chunk
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # Vector embedding (populated by embedding service)
    # Using pgvector for 1536-dimensional embeddings (text-embedding-3-small)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)

    # Chunk metadata: {page_num, start_char, end_char, document_title, space_id, ...}
    chunk_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Character positions in original document
    start_char: Mapped[int] = mapped_column(BigInteger, nullable=False)
    end_char: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")

    def __repr__(self) -> str:
        """String representation of the chunk."""
        return f"<DocumentChunk(id={self.id}, document_id={self.document_id}, index={self.chunk_index}, tokens={self.token_count})>"
