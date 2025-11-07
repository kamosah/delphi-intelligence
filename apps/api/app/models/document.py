"""Document model for storing uploaded documents for AI analysis."""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from uuid import UUID as PyUUID  # noqa: N811

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document_chunk import DocumentChunk
    from .space import Space
    from .thread_document import ThreadDocument
    from .user import User


class DocumentStatus(str, PyEnum):
    """Document processing status."""

    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class Document(Base):
    """Document model for storing uploaded files with AI processing metadata."""

    __tablename__ = "documents"

    # Document identification
    space_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # File information
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)  # MIME type

    file_path: Mapped[str] = mapped_column(String(500), nullable=False)  # Supabase Storage path

    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Processing status - will be migrated to use document_status enum
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DocumentStatus.UPLOADED.value, index=True
    )

    # Content fields - keeping both for Supabase compatibility
    content: Mapped[str | None] = mapped_column(Text, nullable=True)  # Original content

    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI-extracted text

    # Document metadata (page_count, word_count, etc.)
    doc_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Processing timestamps
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Creator
    uploaded_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="documents")

    uploader: Mapped["User"] = relationship("User", back_populates="uploaded_documents")

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )

    thread_documents: Mapped[list["ThreadDocument"]] = relationship(
        "ThreadDocument", back_populates="document", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of the document."""
        return f"<Document(id={self.id}, name={self.name}, status={self.status})>"
