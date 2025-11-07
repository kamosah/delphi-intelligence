"""OrganizationMember model for organization membership and roles."""

from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .organization import Organization
    from .user import User


class OrganizationRole(str, Enum):
    """Enum for organization member roles."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class OrganizationMember(Base):
    """Association table for organization membership with roles."""

    __tablename__ = "organization_members"

    # Member fields
    organization_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    organization_role: Mapped[OrganizationRole] = mapped_column(
        SQLEnum(
            OrganizationRole,
            name="organization_role",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=OrganizationRole.MEMBER,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="members")

    user: Mapped["User"] = relationship("User", back_populates="organization_memberships")

    # Constraints
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="unique_organization_user"),
    )

    def __repr__(self) -> str:
        """String representation of the organization member."""
        return f"<OrganizationMember(organization_id={self.organization_id}, user_id={self.user_id}, role={self.organization_role})>"
