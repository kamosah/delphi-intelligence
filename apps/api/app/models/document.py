"""Document model for storing collaborative documents."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .space import Space
    from .user import User


class Document(Base):
    """Document model for storing collaborative documents with Yjs support."""

    __tablename__ = "documents"

    # Document fields
    space_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    content: Mapped[str] = mapped_column(Text, default="", nullable=False)

    yjs_state: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="documents")

    creator: Mapped["User"] = relationship("User", back_populates="created_documents")

    def __repr__(self) -> str:
        """String representation of the document."""
        return f"<Document(id={self.id}, title={self.title})>"

