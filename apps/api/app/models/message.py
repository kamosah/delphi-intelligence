"""Message model for multi-turn conversations within threads."""

from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .thread import Thread


class MessageRole(str, PyEnum):
    """Message role enum for conversation participants."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(Base):
    """
    Message model for individual messages within multi-turn thread conversations.

    Enables ChatGPT-style follow-up questions within the same thread.
    Each message represents one turn in the conversation (user question or AI response).

    Metadata structure in JSONB:
    {
        "citations": [...],           # Document citations for this specific message
        "confidence_score": 0.85,     # Confidence for this response
        "model_used": "gpt-4-turbo",  # LLM model used
        "tokens_used": 1500,          # Token count for this message
        "processing_time_ms": 2500    # Processing time in milliseconds
    }
    """

    __tablename__ = "messages"

    # Foreign key to thread (CASCADE delete)
    thread_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Message role using message_role enum
    message_role: Mapped[MessageRole] = mapped_column(
        SQLEnum(MessageRole, name="message_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    # Message content
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Message metadata for citations, confidence, model info (mapped to 'metadata' column)
    # Using lambda to avoid shared mutable default (Copilot suggestion)
    message_metadata: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=lambda: {},  # noqa: PIE807
        server_default="{}",
    )

    # Relationships
    thread: Mapped["Thread"] = relationship("Thread", back_populates="messages")

    def __repr__(self) -> str:
        """String representation of the message."""
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"<Message(id={self.id}, message_role={self.message_role.value}, content={content_preview})>"
