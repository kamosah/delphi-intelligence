"""Organization selection and management service."""

from datetime import datetime, UTC
from uuid import UUID

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization_member import OrganizationMember as OrganizationMemberModel


class OrganizationService:
    """Service for organization selection and switching logic."""

    @staticmethod
    async def get_current_organization_id(
        user_id: UUID,
        db: AsyncSession,
    ) -> UUID | None:
        """
        Get user's current organization using hybrid selection logic.

        Selection priority:
        1. Organization with is_default=true
        2. Most recent last_active_at
        3. First membership by created_at

        Args:
            user_id: The user's UUID
            db: Database session

        Returns:
            Organization UUID or None if user has no memberships
        """
        # Single query: prioritize is_default, then last_active_at, then created_at
        stmt = (
            select(OrganizationMemberModel.organization_id)
            .where(OrganizationMemberModel.user_id == user_id)
            .order_by(
                OrganizationMemberModel.is_default.desc().nulls_last(),
                OrganizationMemberModel.last_active_at.desc().nulls_last(),
                OrganizationMemberModel.created_at.asc(),
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def switch_organization(
        user_id: UUID,
        new_org_id: UUID,
        db: AsyncSession,
    ) -> None:
        """
        Switch user's current organization.

        Uses transaction with row-level locking to prevent race conditions.

        1. Validates membership exists (with row lock)
        2. Unsets is_default on all user's memberships
        3. Sets is_default=true on new org
        4. Updates last_active_at on new org

        Args:
            user_id: The user's UUID
            new_org_id: The new organization UUID to switch to
            db: Database session

        Raises:
            ValueError: If user is not a member of new_org_id
        """
        async with db.begin():
            # Verify membership with row-level lock
            membership_stmt = (
                select(OrganizationMemberModel)
                .where(
                    and_(
                        OrganizationMemberModel.user_id == user_id,
                        OrganizationMemberModel.organization_id == new_org_id,
                    )
                )
                .with_for_update()
            )
            result = await db.execute(membership_stmt)
            membership = result.scalar_one_or_none()

            if not membership:
                msg = f"User {user_id} is not a member of organization {new_org_id}"
                raise ValueError(msg)

            # Unset all defaults for this user
            await db.execute(
                update(OrganizationMemberModel)
                .where(OrganizationMemberModel.user_id == user_id)
                .values(is_default=False)
            )

            # Set new default and update last_active_at
            await db.execute(
                update(OrganizationMemberModel)
                .where(
                    and_(
                        OrganizationMemberModel.user_id == user_id,
                        OrganizationMemberModel.organization_id == new_org_id,
                    )
                )
                .values(is_default=True, last_active_at=datetime.now(UTC))
            )

        # No need to call db.commit() here; db.begin() context manager handles commit/rollback.
