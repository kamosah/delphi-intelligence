"""User model for authentication and user management."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document
    from .message import Message
    from .organization import Organization
    from .organization_member import OrganizationMember
    from .space import Space, SpaceMember
    from .thread import Thread
    from .user_preferences import UserPreferences


class UserRole(StrEnum):
    """Enum for user roles (legacy, kept for Supabase compatibility)."""

    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class User(Base):
    """User model for storing user information."""

    __tablename__ = "users"

    # Supabase Auth integration
    auth_user_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True, unique=True
    )

    # User fields
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # User role (legacy field from Supabase, using user_role enum)
    # Note: This is a legacy field not currently used in the application
    role: Mapped[UserRole | None] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_role",
            values_callable=lambda x: [e.value for e in x],
            create_constraint=False,  # Don't create enum type (legacy field)
        ),
        nullable=True,
        default=None,  # No default to avoid enum issues
    )

    # Status fields
    is_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=True)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    owned_organizations: Mapped[list["Organization"]] = relationship(
        "Organization", back_populates="owner", cascade="all, delete-orphan"
    )

    organization_memberships: Mapped[list["OrganizationMember"]] = relationship(
        "OrganizationMember", back_populates="user", cascade="all, delete-orphan"
    )

    owned_spaces: Mapped[list["Space"]] = relationship(
        "Space", back_populates="owner", cascade="all, delete-orphan"
    )

    space_memberships: Mapped[list["SpaceMember"]] = relationship(
        "SpaceMember", back_populates="user", cascade="all, delete-orphan"
    )

    uploaded_documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="uploader", cascade="all, delete-orphan"
    )

    # Owned threads (new ownership model)
    # NO CASCADE: Threads persist when user deleted (SET NULL at DB level)
    # Allows ownership reassignment to space/org default owner (LOG-260)
    owned_threads: Mapped[list["Thread"]] = relationship(
        "Thread",
        foreign_keys="[Thread.owner_user_id]",
        back_populates="owner",
    )

    # Created threads (immutable provenance tracking)
    # NO CASCADE: Preserve thread history when user deleted (SET NULL at DB level)
    created_threads: Mapped[list["Thread"]] = relationship(
        "Thread",
        foreign_keys="[Thread.created_by]",
        back_populates="creator",
    )

    # Authored messages (new authorship tracking)
    authored_messages: Mapped[list["Message"]] = relationship(
        "Message",
        foreign_keys="[Message.author_user_id]",
        back_populates="author",
    )

    preferences: Mapped["UserPreferences | None"] = relationship(
        "UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of the user."""
        return f"<User(id={self.id}, email={self.email})>"
