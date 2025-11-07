"""Space and SpaceMember models for workspace management."""

from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document
    from .organization import Organization
    from .thread import Thread
    from .user import User


class MemberRole(str, Enum):
    """Enum for space member roles."""

    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class Space(Base):
    """Space model for organizing documents and queries."""

    __tablename__ = "spaces"

    # Space fields
    organization_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    icon_color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    max_members: Mapped[int | None] = mapped_column(Integer, nullable=True)

    owner_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships - use selectin for automatic eager loading
    organization: Mapped["Organization"] = relationship("Organization", back_populates="spaces")

    owner: Mapped["User"] = relationship("User", back_populates="owned_spaces")

    members: Mapped[list["SpaceMember"]] = relationship(
        "SpaceMember",
        back_populates="space",
        lazy="selectin",  # Always eager load to avoid async lazy-loading issues
        cascade="all, delete-orphan",
    )

    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="space",
        lazy="selectin",  # Always eager load to avoid async lazy-loading issues
        cascade="all, delete-orphan",
    )

    threads: Mapped[list["Thread"]] = relationship(
        "Thread",
        back_populates="space",
        lazy="selectin",  # Always eager load to avoid async lazy-loading issues
        cascade="all, delete-orphan",
    )

    # Computed properties - safe to use because relationships are eager loaded
    @property
    def member_count(self) -> int:
        """Get the number of members in this space.

        Safe in async context because members relationship uses lazy='selectin'.
        """
        return len(self.members) if self.members else 0

    @property
    def document_count(self) -> int:
        """Get the number of documents in this space.

        Safe in async context because documents relationship uses lazy='selectin'.
        """
        return len(self.documents) if self.documents else 0

    def __repr__(self) -> str:
        """String representation of the space."""
        return f"<Space(id={self.id}, name={self.name})>"


class SpaceMember(Base):
    """Association table for space membership with roles."""

    __tablename__ = "space_members"

    # Member fields
    space_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    member_role: Mapped[MemberRole] = mapped_column(
        SQLEnum(MemberRole, name="member_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberRole.VIEWER,
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="members")

    user: Mapped["User"] = relationship("User", back_populates="space_memberships")

    # Constraints
    __table_args__ = (UniqueConstraint("space_id", "user_id", name="unique_space_user"),)

    def __repr__(self) -> str:
        """String representation of the space member."""
        return f"<SpaceMember(space_id={self.space_id}, user_id={self.user_id}, role={self.member_role})>"
