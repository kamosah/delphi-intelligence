"""Permission checking service for access control."""

from typing import Union
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.space import MemberRole, Space, SpaceMember
from app.models.user import User


class PermissionService:
    """Service for checking user permissions on resources."""

    @staticmethod
    async def can_access_space(
        user: User, space_id: UUID, db: AsyncSession, min_role: MemberRole = MemberRole.VIEWER
    ) -> bool:
        """
        Check if a user can access a space with at least the specified role.

        Args:
            user: The user model to check
            space_id: UUID of the space
            db: Database session
            min_role: Minimum required role (default: VIEWER)

        Returns:
            True if user has access, False otherwise
        """
        # Get space
        result = await db.execute(select(Space).where(Space.id == space_id))
        space = result.scalar_one_or_none()

        if not space:
            return False

        # Owner always has access
        if space.owner_id == user.id:
            return True

        # Check if space is public
        if space.is_public and min_role == MemberRole.VIEWER:
            return True

        # Check membership
        membership_result = await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id == space_id, SpaceMember.user_id == user.id
            )
        )
        membership: SpaceMember | None = membership_result.scalar_one_or_none()

        if not membership:
            return False

        # Check role hierarchy: owner > editor > viewer
        role_hierarchy = {
            MemberRole.OWNER: 3,
            MemberRole.EDITOR: 2,
            MemberRole.VIEWER: 1,
        }

        user_role_level = role_hierarchy.get(membership.member_role, 0)
        required_role_level = role_hierarchy.get(min_role, 0)

        return user_role_level >= required_role_level

    @staticmethod
    async def can_upload_to_space(user: User, space_id: UUID, db: AsyncSession) -> bool:
        """
        Check if a user can upload documents to a space.

        Requires EDITOR role or higher.

        Args:
            user: The user to check
            space_id: UUID of the space
            db: Database session

        Returns:
            True if user can upload, False otherwise
        """
        return await PermissionService.can_access_space(
            user, space_id, db, min_role=MemberRole.EDITOR
        )

    @staticmethod
    async def can_delete_from_space(user: User, space_id: UUID, db: AsyncSession) -> bool:
        """
        Check if a user can delete documents from a space.

        Requires EDITOR role or higher.

        Args:
            user: The user to check
            space_id: UUID of the space
            db: Database session

        Returns:
            True if user can delete, False otherwise
        """
        return await PermissionService.can_access_space(
            user, space_id, db, min_role=MemberRole.EDITOR
        )


# Global permission service instance
permission_service = PermissionService()
