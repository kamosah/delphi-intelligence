"""Organization model for multi-tenant support."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .organization_member import OrganizationMember
    from .space import Space
    from .thread import Thread
    from .user import User


class Organization(Base):
    """Organization model for multi-tenant workspace isolation.

    Organizations serve as the top-level container for all resources.
    Each organization has its own spaces, threads, and members.
    """

    __tablename__ = "organizations"

    # Organization fields
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships - use selectin for automatic eager loading
    owner: Mapped["User | None"] = relationship("User", back_populates="owned_organizations")

    members: Mapped[list["OrganizationMember"]] = relationship(
        "OrganizationMember",
        back_populates="organization",
        lazy="selectin",  # Always eager load to avoid async lazy-loading issues
        cascade="all, delete-orphan",
    )

    spaces: Mapped[list["Space"]] = relationship(
        "Space",
        back_populates="organization",
        lazy="selectin",  # Always eager load to avoid async lazy-loading issues
        cascade="all, delete-orphan",
    )

    threads: Mapped[list["Thread"]] = relationship(
        "Thread",
        back_populates="organization",
        lazy="selectin",  # Always eager load to avoid async lazy-loading issues
        cascade="all, delete-orphan",
    )

    # Computed properties - safe to use because relationships are eager loaded
    @property
    def member_count(self) -> int:
        """Get the number of members in this organization.

        Safe in async context because members relationship uses lazy='selectin'.
        """
        return len(self.members) if self.members else 0

    @property
    def space_count(self) -> int:
        """Get the number of spaces in this organization.

        Safe in async context because spaces relationship uses lazy='selectin'.
        """
        return len(self.spaces) if self.spaces else 0

    @property
    def thread_count(self) -> int:
        """Get the number of threads in this organization.

        Safe in async context because threads relationship uses lazy='selectin'.
        """
        return len(self.threads) if self.threads else 0

    def __repr__(self) -> str:
        """String representation of the organization."""
        return f"<Organization(id={self.id}, name={self.name}, slug={self.slug})>"
