"""Permission checking service for access control."""

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

    @staticmethod
    async def can_delete_from_spaces_batch(
        user: User, space_ids: list[UUID], db: AsyncSession
    ) -> dict[UUID, bool]:
        """
        Batch check if a user can delete documents from multiple spaces.

        This is optimized to fetch all spaces and memberships in 2 queries total,
        avoiding N+1 query problems when checking permissions for many spaces.

        Requires EDITOR role or higher for each space.

        Args:
            user: The user to check
            space_ids: List of space UUIDs to check
            db: Database session

        Returns:
            Dictionary mapping space_id -> can_delete (bool)

        Example:
            >>> space_ids = [uuid1, uuid2, uuid3]
            >>> permissions = await can_delete_from_spaces_batch(user, space_ids, db)
            >>> permissions[uuid1]  # True or False
        """
        if not space_ids:
            return {}

        # Fetch all spaces in one query
        spaces_result = await db.execute(select(Space).where(Space.id.in_(space_ids)))
        spaces: dict[UUID, Space] = {space.id: space for space in spaces_result.scalars().all()}  # type: ignore[misc]

        # Fetch all memberships for this user in one query
        memberships_result = await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id.in_(space_ids), SpaceMember.user_id == user.id
            )
        )
        memberships: dict[UUID, SpaceMember] = {
            membership.space_id: membership for membership in memberships_result.scalars().all()  # type: ignore[misc]
        }

        # Role hierarchy for permission checking
        role_hierarchy = {
            MemberRole.OWNER: 3,
            MemberRole.EDITOR: 2,
            MemberRole.VIEWER: 1,
        }
        min_role_level = role_hierarchy[MemberRole.EDITOR]

        # Check permissions for each space
        permissions: dict[UUID, bool] = {}
        for space_id in space_ids:
            space: Space | None = spaces.get(space_id)

            # Space doesn't exist - no permission
            if not space:
                permissions[space_id] = False
                continue

            # Owner always has permission
            if space.owner_id == user.id:
                permissions[space_id] = True
                continue

            # Check membership and role level
            membership: SpaceMember | None = memberships.get(space_id)
            if not membership:
                permissions[space_id] = False
                continue

            user_role_level = role_hierarchy.get(membership.member_role, 0)
            permissions[space_id] = user_role_level >= min_role_level

        return permissions


# Global permission service instance
permission_service = PermissionService()
