"""Organization invitation model for email-based team invitations."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.organization_member import OrganizationRole

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User


class InvitationStatus(StrEnum):
    """Status of an organization invitation.

    Lifecycle:
    - PENDING: Invitation sent, awaiting acceptance
    - ACCEPTED: User accepted and joined organization
    - EXPIRED: Invitation passed expiration date
    - REVOKED: Invitation manually canceled by inviter/admin
    """

    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class OrganizationInvitation(Base):
    """Organization invitation for email-based team onboarding.

    Tracks invitations sent via Supabase's inviteUserByEmail() system.
    Supports role specification, expiration, and status tracking.

    Workflow:
    1. Admin/owner invites user via email
    2. Backend calls Supabase inviteUserByEmail()
    3. Supabase sends email with magic link
    4. User clicks link → Supabase auth flow
    5. User sets password → Account activated
    6. Backend webhook receives event → Accept invitation + create membership

    Attributes:
        organization_id: Organization receiving the invite
        inviter_id: User who sent the invitation
        invitee_email: Email address of person being invited
        invitee_user_id: User ID once they accept (NULL until accepted)
        invitation_role: Role to assign upon acceptance (member, admin, owner)
        status: Current invitation status (pending, accepted, expired, revoked)
        expires_at: When invitation expires (typically 7 days)
        accepted_at: When invitation was accepted
        revoked_at: When invitation was revoked (if applicable)
        supabase_user_id: Supabase auth user ID from inviteUserByEmail()
        invitation_metadata: Additional data (redirect URL, custom message, etc.)
    """

    __tablename__ = "organization_invitations"

    # Foreign keys
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    inviter_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    invitee_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    # Invitation details
    invitee_email: Mapped[str] = mapped_column(String(255), nullable=False)
    invitation_role: Mapped[OrganizationRole] = mapped_column(
        SQLEnum(OrganizationRole, name="organization_role"),
        nullable=False,
        default=OrganizationRole.MEMBER,
    )

    # Status tracking
    status: Mapped[InvitationStatus] = mapped_column(
        SQLEnum(InvitationStatus, name="invitation_status"),
        nullable=False,
        default=InvitationStatus.PENDING,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Supabase integration
    supabase_user_id: Mapped[UUID | None] = mapped_column()

    # Metadata
    invitation_metadata: Mapped[dict | None] = mapped_column(JSONB)

    # Relationships
    organization: Mapped["Organization"] = relationship(
        back_populates="invitations",
        foreign_keys=[organization_id],
    )
    inviter: Mapped["User"] = relationship(foreign_keys=[inviter_id])
    invitee: Mapped["User | None"] = relationship(foreign_keys=[invitee_user_id])

    def __repr__(self) -> str:
        """String representation of invitation."""
        return (
            f"<OrganizationInvitation(id={self.id}, "
            f"email={self.invitee_email}, "
            f"status={self.status.value}, "
            f"org={self.organization_id})>"
        )
