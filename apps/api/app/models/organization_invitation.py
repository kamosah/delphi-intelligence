"""OrganizationInvitation model for tracking organization member invitations."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .organization_member import OrganizationRole

if TYPE_CHECKING:
    from .organization import Organization
    from .user import User


class InvitationStatus(StrEnum):
    """Invitation lifecycle status."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class OrganizationInvitation(Base):
    """Organization invitation tracking with lifecycle management."""

    __tablename__ = "organization_invitations"

    # Primary fields
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    organization_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Invitee information
    invitee_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    invitation_role: Mapped[OrganizationRole] = mapped_column(
        nullable=False, default=OrganizationRole.MEMBER
    )

    # Lifecycle tracking
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=InvitationStatus.PENDING.value, index=True
    )

    invited_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    invited_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    accepted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    revoked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    revoked_by: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Metadata
    custom_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=lambda: datetime.now(UTC)
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=lambda: datetime.now(UTC)
    )

    # Relationships (eager loaded to avoid N+1)
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="invitations", lazy="selectin"
    )

    inviter: Mapped["User"] = relationship("User", foreign_keys=[invited_by], lazy="selectin")

    revoker: Mapped["User | None"] = relationship(
        "User", foreign_keys=[revoked_by], lazy="selectin"
    )

    # Table constraints
    __table_args__ = (
        Index(
            "idx_org_invitations_unique_pending",
            organization_id,
            invitee_email,
            unique=True,
            postgresql_where=(status == InvitationStatus.PENDING.value),
        ),
        Index("idx_org_invitations_email_status_expires", invitee_email, status, expires_at),
    )

    def __repr__(self) -> str:
        """String representation of the invitation."""
        return f"<OrganizationInvitation(id={self.id}, email={self.invitee_email}, status={self.status})>"
