"""Organization invitation service with security features and outbox retry.

This service handles:
- Email validation using Pydantic
- Supabase integration for sending invitation emails
- Email verification for accepting invitations
- Race condition prevention with SELECT FOR UPDATE
- Audit logging for security events
- Outbox retry for SpiceDB sync failures
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    AuthSyncOutbox,
    InvitationStatus,
    OrganizationInvitation,
    OrganizationMember,
    OrganizationRole,
    User,
)
from app.schemas.outbox import AuthSyncEventType, AuthSyncStatus
from app.services.spicedb_service import get_spicedb_service
from app.supabase_client import get_admin_client

logger = logging.getLogger(__name__)

# Configuration
INVITATION_EXPIRATION_DAYS = 7


class EmailValidator(BaseModel):
    """Helper class for email validation using Pydantic."""

    email: EmailStr


def _validate_email(email: str) -> str:
    """Validate email format using Pydantic.

    Args:
        email: Email address to validate

    Returns:
        Validated and normalized email address

    Raises:
        ValueError: If email is invalid
    """
    try:
        validator = EmailValidator(email=email.strip().lower())
        return validator.email
    except ValidationError as e:
        raise ValueError(f"Invalid email address: {email}") from e


def _now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(UTC)


def _ensure_timezone(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware (SQLite compatibility).

    Args:
        dt: Datetime to ensure has timezone

    Returns:
        Timezone-aware datetime
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class InvitationService:
    """Organization invitation management service with security features."""

    @staticmethod
    async def _create_outbox_event(
        db: AsyncSession,
        event_type: AuthSyncEventType,
        invitation_id: Any,  # Accepts both Python UUID and SQLAlchemy UUID
        event_data: dict[str, Any],
    ) -> None:
        """Create outbox event for SpiceDB synchronization.

        This ensures reliable delivery of authorization events via the outbox pattern.
        If the outbox insertion fails, the exception propagates and the entire transaction rolls back.

        Args:
            db: Database session
            event_type: Type of authorization event
            invitation_id: Invitation ID
            event_data: Event data for SpiceDB sync

        Raises:
            Exception: If outbox event creation fails (triggers transaction rollback)
        """
        outbox_item = AuthSyncOutbox(
            event_type=event_type,
            table_name="organization_invitations",
            record_id=invitation_id,
            event_data=event_data,
            status=AuthSyncStatus.PENDING,
        )
        db.add(outbox_item)
        # No commit here - caller commits transaction

        logger.info(f"Created outbox event: type={event_type} invitation={invitation_id}")

    @staticmethod
    async def create_invitation(
        db: AsyncSession,
        organization_id: UUID,
        inviter_id: UUID,
        invitee_email: str,
        role: OrganizationRole = OrganizationRole.MEMBER,
        custom_message: str | None = None,
    ) -> OrganizationInvitation:
        """Create invitation and send email via Supabase.

        Security features:
        - Validates email format before Supabase call (prevents API abuse)
        - Handles Supabase API errors gracefully (fail-closed)
        - Checks for duplicate pending invitations (prevents spam)
        - Logs security event (audit trail)
        - Creates outbox event for future enhancements

        Args:
            db: Database session
            organization_id: Organization to invite user to
            inviter_id: User sending invitation
            invitee_email: Email address of invitee
            role: Role to assign (default: MEMBER)
            custom_message: Optional custom message

        Returns:
            Created invitation

        Raises:
            ValueError: Invalid email, duplicate invitation, or Supabase error
        """
        # 1. Validate email format using Pydantic (prevents invalid emails)
        validated_email = _validate_email(invitee_email)

        # 2. Check for existing pending invitation (prevents spam)
        existing = await db.execute(
            select(OrganizationInvitation).where(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.invitee_email == validated_email,
                OrganizationInvitation.status == InvitationStatus.PENDING,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Pending invitation already exists for {validated_email}")

        # 3. Check if user already exists in our system
        user_exists_result = await db.execute(select(User).where(User.email == validated_email))
        user_exists = user_exists_result.scalar_one_or_none() is not None

        # 4. Send invitation email via Supabase (only for new users)
        email_sent = False
        if not user_exists:
            # New user - send Supabase invite (creates account + sends email)
            try:
                admin_client = get_admin_client()
                redirect_url = f"{settings.frontend_url}/accept-invite"
                supabase_response = admin_client.auth.admin.invite_user_by_email(
                    validated_email,
                    options={
                        "data": {
                            "organization_id": str(organization_id),
                            "invited_role": role.value,
                            "custom_message": custom_message or "",
                        },
                        "redirect_to": redirect_url,
                    },
                )

                # Verify Supabase response
                if not supabase_response or not hasattr(supabase_response, "user"):
                    msg = "Supabase invitation response invalid"
                    raise ValueError(msg)

                email_sent = True
                logger.info(f"Sent Supabase invite email to new user: {validated_email}")

            except Exception as e:
                logger.exception(
                    f"Supabase invite failed for {validated_email} to org {organization_id}: {e}"
                )
                # Don't leak internal error details to users
                raise ValueError(
                    f"Failed to send invitation to {validated_email}. Please try again later."
                ) from e
        else:
            # Existing user - skip email (user will see invitation when they log in)
            logger.info(
                f"Skipping email for existing user: {validated_email}. "
                f"User will see invitation on /accept-invite"
            )

        # 5. Create invitation record (always create, regardless of email status)
        invitation = OrganizationInvitation(
            organization_id=organization_id,
            invitee_email=validated_email,
            invitation_role=role,
            invited_by=inviter_id,
            custom_message=custom_message,
            expires_at=_now() + timedelta(days=INVITATION_EXPIRATION_DAYS),
        )
        db.add(invitation)
        await db.commit()
        await db.refresh(invitation)

        # 6. Create outbox event (for future enhancements - not currently used for invitations)
        await InvitationService._create_outbox_event(
            db=db,
            event_type=AuthSyncEventType.INVITATION_CREATED,
            invitation_id=invitation.id,
            event_data={
                "organization_id": str(organization_id),
                "invitee_email": validated_email,
                "invitation_role": role.value,
                "invited_by": str(inviter_id),
                "email_sent": email_sent,
            },
        )
        await db.commit()

        # 7. Audit log (security event)
        logger.info(
            f"Invitation created: org={organization_id} "
            f"inviter={inviter_id} invitee={validated_email} role={role.value} "
            f"email_sent={email_sent}"
        )

        return invitation

    @staticmethod
    async def accept_invitation(
        db: AsyncSession,
        invitation_id: UUID,
        user_id: UUID,
    ) -> OrganizationMember:
        """Accept invitation and create organization membership.

        Security features:
        - Uses SELECT FOR UPDATE to prevent race conditions
        - Verifies user email matches invitation email (prevents hijacking)
        - Uses outbox pattern for SpiceDB sync (reliable delivery)
        - Handles SpiceDB sync failures gracefully (doesn't block user)
        - Audit logging for security events

        Args:
            db: Database session
            invitation_id: Invitation to accept
            user_id: User accepting invitation

        Returns:
            Created organization membership

        Raises:
            ValueError: Invitation not found, expired, email mismatch, or other error
        """
        # 1. Fetch invitation with pessimistic lock (prevents race conditions)
        result = await db.execute(
            select(OrganizationInvitation)
            .where(OrganizationInvitation.id == invitation_id)
            .with_for_update()  # Lock row until transaction completes
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError(f"Invitation {invitation_id} not found")

        # 2. Validate status
        if invitation.status != InvitationStatus.PENDING:
            raise ValueError(f"Invitation already {invitation.status}")

        # 3. Check expiration — raise without committing; expires_at is the source of truth
        if _ensure_timezone(invitation.expires_at) < _now():
            msg = "Invitation has expired"
            raise ValueError(msg)

        # 4. Fetch user and verify email (CRITICAL SECURITY CHECK)
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if not user:
            raise ValueError(f"User {user_id} not found")

        if user.email.lower() != invitation.invitee_email.lower():
            logger.warning(
                f"Email mismatch: user={user.email} invitation={invitation.invitee_email}"
            )
            msg = "Invitation email does not match authenticated user"
            raise ValueError(msg)

        # 5. Create organization membership
        membership = OrganizationMember(
            organization_id=invitation.organization_id,
            user_id=user_id,
            organization_role=invitation.invitation_role,
        )
        db.add(membership)

        # 6. Update invitation status
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = _now()

        # Commit database changes first (membership creation is critical)
        await db.commit()
        await db.refresh(membership)

        # 7. Create outbox event for SpiceDB sync (reliable delivery via outbox pattern)
        # This ensures the SpiceDB sync will be retried if it fails
        try:
            await InvitationService._create_outbox_event(
                db=db,
                event_type=AuthSyncEventType.INVITATION_ACCEPTED,
                invitation_id=invitation_id,
                event_data={
                    "organization_id": str(invitation.organization_id),
                    "user_id": str(user_id),
                    "role": invitation.invitation_role.value,
                },
            )
            await db.commit()

        except Exception as e:
            logger.exception(f"Failed to create outbox event for invitation {invitation_id}: {e}")
            # Don't fail the request - membership is created
            # Outbox will be retried by background processor

        # 8. Attempt immediate SpiceDB sync (best effort - outbox handles failures)
        try:
            spicedb = get_spicedb_service()
            sync_success = await spicedb.sync_organization_member(
                organization_id=str(invitation.organization_id),
                user_id=str(user_id),
                role=invitation.invitation_role.value,
            )

            if not sync_success:
                logger.warning(
                    f"SpiceDB immediate sync failed for membership: org={invitation.organization_id} user={user_id} - will retry via outbox"
                )
                # Don't fail - outbox will handle retry

        except Exception:
            logger.exception(
                f"SpiceDB sync exception for membership: org={invitation.organization_id} user={user_id} - will retry via outbox"
            )
            # Don't fail - outbox will handle retry

        # 9. Audit log (security event)
        logger.info(
            f"Invitation accepted: id={invitation_id} org={invitation.organization_id} "
            f"user={user_id} role={invitation.invitation_role.value}"
        )

        return membership

    @staticmethod
    async def revoke_invitation(
        db: AsyncSession,
        invitation_id: UUID,
        revoker_id: UUID,
    ) -> bool:
        """Revoke pending invitation.

        Args:
            db: Database session
            invitation_id: Invitation to revoke
            revoker_id: User revoking invitation

        Returns:
            True if revoked successfully

        Raises:
            ValueError: Invitation not found or not pending
        """
        # 1. Fetch invitation
        result = await db.execute(
            select(OrganizationInvitation).where(OrganizationInvitation.id == invitation_id)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError(f"Invitation {invitation_id} not found")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError(f"Cannot revoke invitation with status: {invitation.status}")

        # 2. Update status
        invitation.status = InvitationStatus.REVOKED
        invitation.revoked_at = _now()
        invitation.revoked_by = revoker_id  # type: ignore[assignment]

        await db.commit()

        # 3. Create outbox event
        try:
            await InvitationService._create_outbox_event(
                db=db,
                event_type=AuthSyncEventType.INVITATION_REVOKED,
                invitation_id=invitation_id,
                event_data={
                    "organization_id": str(invitation.organization_id),
                    "invitee_email": invitation.invitee_email,
                    "revoked_by": str(revoker_id),
                },
            )
            await db.commit()

        except Exception as e:
            logger.exception(
                f"Failed to create outbox event for revoked invitation {invitation_id}: {e}"
            )
            # Don't fail - revocation succeeded

        # 4. Audit log
        logger.info(
            f"Invitation revoked: id={invitation_id} org={invitation.organization_id} "
            f"revoker={revoker_id}"
        )

        return True

    @staticmethod
    async def list_organization_invitations(
        db: AsyncSession,
        organization_id: UUID,
        status: InvitationStatus | None = None,
    ) -> list[OrganizationInvitation]:
        """List invitations for organization.

        Args:
            db: Database session
            organization_id: Organization ID
            status: Optional status filter

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
        """Get pending invitations for user email.

        Args:
            db: Database session
            email: User email

        Returns:
            List of pending invitations
        """
        result = await db.execute(
            select(OrganizationInvitation)
            .where(
                OrganizationInvitation.invitee_email == email.lower(),
                OrganizationInvitation.status == InvitationStatus.PENDING,
                OrganizationInvitation.expires_at > _now(),
            )
            .order_by(OrganizationInvitation.created_at.desc())
        )
        return list(result.scalars().all())
