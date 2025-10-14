"""User model for authentication and user management."""

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document
    from .query import Query
    from .space import Space, SpaceMember
    from .user_preferences import UserPreferences


class User(Base):
    """User model for storing user information."""

    __tablename__ = "users"

    # User fields
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # New field to test automated migration generation
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    owned_spaces: Mapped[list["Space"]] = relationship(
        "Space", back_populates="owner", cascade="all, delete-orphan"
    )

    space_memberships: Mapped[list["SpaceMember"]] = relationship(
        "SpaceMember", back_populates="user", cascade="all, delete-orphan"
    )

    uploaded_documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="uploader", cascade="all, delete-orphan"
    )

    created_queries: Mapped[list["Query"]] = relationship(
        "Query", back_populates="creator", cascade="all, delete-orphan"
    )

    preferences: Mapped["UserPreferences | None"] = relationship(
        "UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of the user."""
        return f"<User(id={self.id}, email={self.email})>"
