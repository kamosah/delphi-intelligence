"""Space and SpaceMember models for workspace management."""

from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .document import Document
    from .query import Query
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
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_spaces")

    members: Mapped[list["SpaceMember"]] = relationship(
        "SpaceMember", back_populates="space", cascade="all, delete-orphan"
    )

    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="space", cascade="all, delete-orphan"
    )

    queries: Mapped[list["Query"]] = relationship(
        "Query", back_populates="space", cascade="all, delete-orphan"
    )

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

    role: Mapped[MemberRole] = mapped_column(
        SQLEnum(MemberRole), nullable=False, default=MemberRole.VIEWER
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="members")

    user: Mapped["User"] = relationship("User", back_populates="space_memberships")

    # Constraints
    __table_args__ = (UniqueConstraint("space_id", "user_id", name="unique_space_user"),)

    def __repr__(self) -> str:
        """String representation of the space member."""
        return f"<SpaceMember(space_id={self.space_id}, user_id={self.user_id}, role={self.role})>"
