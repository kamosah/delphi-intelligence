"""Organization invitation service using Supabase inviteUserByEmail."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    InvitationStatus,
    OrganizationInvitation,
    OrganizationMember,
    OrganizationRole,
)
from app.schemas.spicedb import WriteRelationshipInput
from app.services.spicedb_service import get_spicedb_service
from app.supabase_client import get_admin_client

# Invitation expires after 7 days by default
INVITATION_EXPIRATION_DAYS = 7


def _now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(UTC)


def _ensure_timezone(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware (SQLite compatibility).

    SQLite doesn't preserve timezone info, so datetimes from the database
    may be timezone-naive even though they're stored as UTC. This helper
    ensures consistency when comparing datetimes.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class InvitationService:
    """Service for organization invitation management."""

    @staticmethod
    async def create_invitation(
        db: AsyncSession,
        organization_id: UUID,
        inviter_id: UUID,
        invitee_email: str,
        role: OrganizationRole = OrganizationRole.MEMBER,
    ) -> OrganizationInvitation:
        """Create invitation and send email via Supabase.

        Workflow:
        1. Check for existing pending invitation (unique constraint)
        2. Call Supabase inviteUserByEmail() to create pre-auth user + send email
        3. Create invitation record in database
        4. Return invitation object

        Args:
            db: Database session
            organization_id: Organization to invite user to
            inviter_id: User sending the invitation
            invitee_email: Email address of person being invited
            role: Role to assign upon acceptance (default: member)

        Returns:
            Created invitation object

        Raises:
            ValueError: If invitation already exists for this email/org
            Exception: If Supabase API call fails
        """
        # Check for existing pending invitation
        existing = await db.execute(
            select(OrganizationInvitation).where(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.invitee_email == invitee_email,
                OrganizationInvitation.status == InvitationStatus.PENDING,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(
                f"Pending invitation already exists for {invitee_email} in organization {organization_id}"
            )

        # Call Supabase to create pre-auth user + send email
        admin_client = get_admin_client()
        supabase_response = admin_client.auth.admin.invite_user_by_email(
            invitee_email,
            options={
                "data": {
                    "organization_id": str(organization_id),
                    "invited_role": role.value,
                }
            },
        )

        # Create invitation record
        invitation = OrganizationInvitation(
            organization_id=organization_id,
            inviter_id=inviter_id,
            invitee_email=invitee_email,
            invitation_role=role,
            supabase_user_id=supabase_response.user.id,
            expires_at=_now() + timedelta(days=INVITATION_EXPIRATION_DAYS),
        )
        db.add(invitation)
        await db.commit()
        await db.refresh(invitation)

        return invitation

    @staticmethod
    async def accept_invitation(
        db: AsyncSession,
        invitation_id: UUID,
        user_id: UUID,
    ) -> OrganizationMember:
        """Accept invitation and create organization membership.

        Workflow:
        1. Fetch invitation by ID
        2. Validate invitation status (must be pending and not expired)
        3. Create organization membership
        4. Update invitation status to accepted
        5. Sync membership to SpiceDB
        6. Return membership object

        Args:
            db: Database session
            invitation_id: Invitation to accept
            user_id: User accepting the invitation

        Returns:
            Created organization membership

        Raises:
            ValueError: If invitation not found, expired, or already accepted
        """
        # Fetch invitation
        result = await db.execute(
            select(OrganizationInvitation).where(OrganizationInvitation.id == invitation_id)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError(f"Invitation {invitation_id} not found")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError(f"Invitation already {invitation.status.value}")

        if _ensure_timezone(invitation.expires_at) < _now():
            # Mark as expired
            invitation.status = InvitationStatus.EXPIRED
            await db.commit()
            msg = "Invitation has expired"
            raise ValueError(msg)

        # Create organization membership
        membership = OrganizationMember(
            organization_id=invitation.organization_id,
            user_id=user_id,
            organization_role=invitation.invitation_role,
        )
        db.add(membership)

        # Update invitation status
        invitation.status = InvitationStatus.ACCEPTED
        invitation.invitee_user_id = user_id
        invitation.accepted_at = _now()

        await db.commit()
        await db.refresh(membership)

        # Sync membership to SpiceDB
        spicedb = get_spicedb_service()
        await spicedb.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=str(membership.organization_id),
                relation=membership.organization_role.value,  # "owner", "admin", or "member"
                subject_type="user",
                subject_id=str(membership.user_id),
            )
        )

        return membership

    @staticmethod
    async def revoke_invitation(
        db: AsyncSession,
        invitation_id: UUID,
    ) -> OrganizationInvitation:
        """Revoke a pending invitation.

        Args:
            db: Database session
            invitation_id: Invitation to revoke

        Returns:
            Revoked invitation object

        Raises:
            ValueError: If invitation not found or not pending
        """
        result = await db.execute(
            select(OrganizationInvitation).where(OrganizationInvitation.id == invitation_id)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError(f"Invitation {invitation_id} not found")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError(f"Cannot revoke invitation with status {invitation.status.value}")

        invitation.status = InvitationStatus.REVOKED
        invitation.revoked_at = _now()

        await db.commit()
        await db.refresh(invitation)

        return invitation

    @staticmethod
    async def list_organization_invitations(
        db: AsyncSession,
        organization_id: UUID,
        status: InvitationStatus | None = None,
    ) -> list[OrganizationInvitation]:
        """List invitations for an organization.

        Args:
            db: Database session
            organization_id: Organization to list invitations for
            status: Optional status filter (pending, accepted, expired, revoked)

        Returns:
            List of invitations
        """
        query = select(OrganizationInvitation).where(
            OrganizationInvitation.organization_id == organization_id
        )

        if status:
            query = query.where(OrganizationInvitation.status == status)

        query = query.order_by(OrganizationInvitation.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_user_pending_invitations(
        db: AsyncSession,
        email: str,
    ) -> list[OrganizationInvitation]:
        """Get pending invitations for a user email.

        Useful for showing invitations after user signs up.

        Args:
            db: Database session
            email: User email address

        Returns:
            List of pending invitations
        """
        result = await db.execute(
            select(OrganizationInvitation)
            .where(
                OrganizationInvitation.invitee_email == email,
                OrganizationInvitation.status == InvitationStatus.PENDING,
                OrganizationInvitation.expires_at > _now(),
            )
            .order_by(OrganizationInvitation.created_at.desc())
        )
        return list(result.scalars().all())
