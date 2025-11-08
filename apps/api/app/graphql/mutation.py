"""GraphQL mutation resolvers."""

import logging
from uuid import UUID

import strawberry
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.session import get_session
from app.models.organization import Organization as OrganizationModel
from app.models.organization_member import (
    OrganizationMember as OrganizationMemberModel,
    OrganizationRole,
)
from app.models.space import MemberRole, Space as SpaceModel, SpaceMember as SpaceMemberModel
from app.models.thread import Thread as ThreadModel
from app.models.user import User as UserModel
from app.utils.slug import generate_unique_slug

from .types import (
    AddOrganizationMemberInput,
    CreateOrganizationInput,
    CreateSpaceInput,
    CreateThreadInput,
    CreateUserInput,
    Organization,
    OrganizationMember,
    OrganizationRole as OrganizationRoleType,
    Space,
    Thread,
    UpdateOrganizationInput,
    UpdateSpaceInput,
    UpdateThreadInput,
    UpdateUserInput,
    User,
)

logger = logging.getLogger(__name__)


@strawberry.type
class Mutation:
    """GraphQL mutation root."""

    @strawberry.mutation
    async def create_user(self, input: CreateUserInput) -> User:
        """Create a new user."""
        async for session in get_session():
            try:
                # Create new user instance
                user_model = UserModel(
                    email=input.email,
                    full_name=input.full_name,
                    avatar_url=input.avatar_url,
                    bio=input.bio,
                )

                session.add(user_model)
                await session.commit()
                await session.refresh(user_model)

                return User.from_model(user_model)

            except IntegrityError:
                await session.rollback()
                raise ValueError(f"User with email {input.email} already exists")

        # Fallback if session doesn't yield for my MyPy
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.mutation
    async def update_user(self, id: strawberry.ID, input: UpdateUserInput) -> User | None:
        """Update an existing user."""
        async for session in get_session():
            try:
                user_id = UUID(str(id))
                stmt = select(UserModel).where(UserModel.id == user_id)
                result = await session.execute(stmt)
                user_model = result.scalar_one_or_none()

                if not user_model:
                    return None

                # Update fields if provided
                if input.full_name is not None:
                    user_model.full_name = input.full_name
                if input.avatar_url is not None:
                    user_model.avatar_url = input.avatar_url
                if input.bio is not None:
                    user_model.bio = input.bio

                await session.commit()
                await session.refresh(user_model)

                return User.from_model(user_model)

            except ValueError:
                # Invalid UUID format
                return None
        return None

    @strawberry.mutation
    async def delete_user(self, id: strawberry.ID) -> bool:
        """Delete a user by ID."""
        async for session in get_session():
            try:
                user_id = UUID(str(id))
                stmt = select(UserModel).where(UserModel.id == user_id)
                result = await session.execute(stmt)
                user_model = result.scalar_one_or_none()

                if not user_model:
                    return False

                await session.delete(user_model)
                await session.commit()

                return True

            except ValueError:
                # Invalid UUID format
                return False
        return False

    @strawberry.mutation
    async def create_organization(
        self, info: strawberry.types.Info, input: CreateOrganizationInput
    ) -> Organization:
        """
        Create a new organization.

        Args:
            input: Organization creation data (name, slug, description)

        Returns:
            The created organization

        Authorization:
            - Any authenticated user can create an organization
            - Creator automatically becomes the owner
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required to create an organization"
                    raise ValueError(msg)

                user_id = user.id

                # Generate unique slug from organization name if not provided
                slug = input.slug
                if not slug:
                    slug = await generate_unique_slug(input.name, session, OrganizationModel)

                # Create new organization instance
                org_model = OrganizationModel(
                    name=input.name,
                    slug=slug,
                    description=input.description,
                    owner_id=user_id,
                )

                session.add(org_model)
                await session.flush()  # Flush to get the organization ID

                # Add creator as owner in organization_members
                org_member = OrganizationMemberModel(
                    organization_id=org_model.id,
                    user_id=user_id,
                    organization_role=OrganizationRole.OWNER,
                )

                session.add(org_member)
                await session.commit()

                # Refresh the model (relationships eager loaded via lazy='selectin')
                await session.refresh(org_model)

                return Organization.from_model(org_model)

            except IntegrityError as e:
                await session.rollback()

                # Handle slug uniqueness violation
                if "unique_constraint" in str(e).lower() or "slug" in str(e).lower():
                    msg = "Organization with this slug already exists"
                    raise ValueError(msg)

                # For other integrity errors, raise generic error
                msg = "Failed to create organization due to database constraint"
                raise ValueError(msg)

        # Fallback if session doesn't yield for MyPy
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.mutation
    async def update_organization(
        self, info: strawberry.types.Info, id: strawberry.ID, input: UpdateOrganizationInput
    ) -> Organization | None:
        """
        Update an existing organization.

        Args:
            id: The organization ID
            input: Organization update data (name, description)

        Returns:
            The updated organization if found, None otherwise

        Authorization:
            - Only owner or admins can update
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                org_id = UUID(str(id))

                # Get organization
                stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
                result = await session.execute(stmt)
                org_model = result.scalar_one_or_none()

                if not org_model:
                    msg = "Organization not found"
                    raise ValueError(msg)

                # Check authorization: owner or admin
                is_owner = org_model.owner_id == user_id

                # Check if user is an admin member
                member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == org_id)
                    & (OrganizationMemberModel.user_id == user_id)
                    & (
                        OrganizationMemberModel.organization_role.in_(
                            [OrganizationRole.ADMIN, OrganizationRole.OWNER]
                        )
                    )
                )
                member_result = await session.execute(member_stmt)
                is_admin = member_result.scalar_one_or_none() is not None

                if not is_owner and not is_admin:
                    msg = "Insufficient permissions to update this organization"
                    raise ValueError(msg)

                # Update fields if provided
                if input.name is not None:
                    org_model.name = input.name
                if input.description is not None:
                    org_model.description = input.description

                await session.commit()
                await session.refresh(org_model)

                return Organization.from_model(org_model)

            except ValueError:
                await session.rollback()
                raise

        return None

    @strawberry.mutation
    async def delete_organization(self, info: strawberry.types.Info, id: strawberry.ID) -> bool:
        """
        Delete an organization by ID.

        Args:
            id: The organization ID

        Returns:
            True if deleted successfully, False otherwise

        Authorization:
            - Only the owner can delete an organization
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                org_id = UUID(str(id))

                # Get organization
                stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
                result = await session.execute(stmt)
                org_model = result.scalar_one_or_none()

                if not org_model:
                    msg = "Organization not found"
                    raise ValueError(msg)

                # Check authorization: only owner can delete
                if org_model.owner_id != user_id:
                    msg = "Only the owner can delete this organization"
                    raise ValueError(msg)

                await session.delete(org_model)
                await session.commit()

                return True

            except ValueError:
                await session.rollback()
                raise

        return False

    @strawberry.mutation
    async def add_organization_member(
        self, info: strawberry.types.Info, input: AddOrganizationMemberInput
    ) -> OrganizationMember:
        """
        Add a member to an organization.

        Args:
            input: AddOrganizationMemberInput with organization_id, user_id, and role

        Returns:
            The created organization member

        Authorization:
            - Only owner or admins can add members
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                current_user_id = user.id
                org_id = UUID(str(input.organization_id))
                target_user_id = UUID(str(input.user_id))

                # Get organization
                org_stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
                org_result = await session.execute(org_stmt)
                org_model = org_result.scalar_one_or_none()

                if not org_model:
                    msg = "Organization not found"
                    raise ValueError(msg)

                # Check authorization: owner or admin
                is_owner = org_model.owner_id == current_user_id

                member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == org_id)
                    & (OrganizationMemberModel.user_id == current_user_id)
                    & (
                        OrganizationMemberModel.organization_role.in_(
                            [OrganizationRole.ADMIN, OrganizationRole.OWNER]
                        )
                    )
                )
                member_result = await session.execute(member_stmt)
                is_admin = member_result.scalar_one_or_none() is not None

                if not is_owner and not is_admin:
                    msg = "Insufficient permissions to add members to this organization"
                    raise ValueError(msg)

                # Verify target user exists
                user_stmt = select(UserModel).where(UserModel.id == target_user_id)
                user_result = await session.execute(user_stmt)
                target_user = user_result.scalar_one_or_none()

                if not target_user:
                    msg = "User not found"
                    raise ValueError(msg)

                # Convert GraphQL enum to database enum
                role = OrganizationRole(input.role.value)

                # Create new organization member
                new_member = OrganizationMemberModel(
                    organization_id=org_id,
                    user_id=target_user_id,
                    organization_role=role,
                )

                session.add(new_member)
                await session.commit()
                await session.refresh(new_member)

                return OrganizationMember.from_model(new_member)

            except IntegrityError as e:
                await session.rollback()
                if "unique" in str(e).lower():
                    msg = "User is already a member of this organization"
                    raise ValueError(msg)
                msg = "Failed to add member due to database constraint"
                raise ValueError(msg)

        # Fallback if session doesn't yield
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.mutation
    async def remove_organization_member(
        self, info: strawberry.types.Info, organization_id: strawberry.ID, user_id: strawberry.ID
    ) -> bool:
        """
        Remove a member from an organization.

        Args:
            organization_id: The organization ID
            user_id: The user ID to remove

        Returns:
            True if removed successfully, False otherwise

        Authorization:
            - Only owner or admins can remove members
            - Cannot remove the owner
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                current_user_id = user.id
                org_id = UUID(str(organization_id))
                target_user_id = UUID(str(user_id))

                # Get organization
                org_stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
                org_result = await session.execute(org_stmt)
                org_model = org_result.scalar_one_or_none()

                if not org_model:
                    msg = "Organization not found"
                    raise ValueError(msg)

                # Cannot remove the owner
                if org_model.owner_id == target_user_id:
                    msg = "Cannot remove the organization owner"
                    raise ValueError(msg)

                # Check authorization: owner or admin
                is_owner = org_model.owner_id == current_user_id

                member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == org_id)
                    & (OrganizationMemberModel.user_id == current_user_id)
                    & (
                        OrganizationMemberModel.organization_role.in_(
                            [OrganizationRole.ADMIN, OrganizationRole.OWNER]
                        )
                    )
                )
                member_result = await session.execute(member_stmt)
                is_admin = member_result.scalar_one_or_none() is not None

                if not is_owner and not is_admin:
                    msg = "Insufficient permissions to remove members from this organization"
                    raise ValueError(msg)

                # Get the member to remove
                target_member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == org_id)
                    & (OrganizationMemberModel.user_id == target_user_id)
                )
                target_member_result = await session.execute(target_member_stmt)
                target_member = target_member_result.scalar_one_or_none()

                if not target_member:
                    msg = "Member not found in this organization"
                    raise ValueError(msg)

                await session.delete(target_member)
                await session.commit()

                return True

            except ValueError:
                await session.rollback()
                raise

        return False

    @strawberry.mutation
    async def update_member_role(
        self,
        info: strawberry.types.Info,
        organization_id: strawberry.ID,
        user_id: strawberry.ID,
        role: OrganizationRoleType,
    ) -> OrganizationMember | None:
        """
        Update a member's role in an organization.

        Args:
            organization_id: The organization ID
            user_id: The user ID whose role to update
            role: The new role

        Returns:
            The updated organization member

        Authorization:
            - Only the owner can update member roles
            - Cannot change the owner's role
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                current_user_id = user.id
                org_id = UUID(str(organization_id))
                target_user_id = UUID(str(user_id))

                # Get organization
                org_stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
                org_result = await session.execute(org_stmt)
                org_model = org_result.scalar_one_or_none()

                if not org_model:
                    msg = "Organization not found"
                    raise ValueError(msg)

                # Only owner can update roles
                if org_model.owner_id != current_user_id:
                    msg = "Only the owner can update member roles"
                    raise ValueError(msg)

                # Cannot change owner's role
                if org_model.owner_id == target_user_id:
                    msg = "Cannot change the owner's role"
                    raise ValueError(msg)

                # Get the member to update
                member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == org_id)
                    & (OrganizationMemberModel.user_id == target_user_id)
                )
                member_result = await session.execute(member_stmt)
                member = member_result.scalar_one_or_none()

                if not member:
                    msg = "Member not found in this organization"
                    raise ValueError(msg)

                # Convert GraphQL enum to database enum
                new_role = OrganizationRole(role.value)
                member.organization_role = new_role

                await session.commit()
                await session.refresh(member)

                return OrganizationMember.from_model(member)

            except ValueError:
                await session.rollback()
                raise

        return None

    @strawberry.mutation
    async def create_space(self, info: strawberry.types.Info, input: CreateSpaceInput) -> Space:
        """
        Create a new space.

        Args:
            input: Space creation data (name, description, icon_color)

        Returns:
            The created space

        Authorization:
            - Any authenticated user can create a space
            - Creator automatically becomes the owner
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required to create a space"
                    raise ValueError(msg)

                user_id = user.id

                # Generate unique slug from space name
                slug = await generate_unique_slug(input.name, session, SpaceModel)

                # Create new space instance
                space_model = SpaceModel(
                    name=input.name,
                    slug=slug,
                    description=input.description,
                    icon_color=input.icon_color,
                    is_public=False,  # Default to private
                    max_members=None,  # No limit by default
                    owner_id=user_id,
                )

                session.add(space_model)
                await session.flush()  # Flush to get the space ID

                # Add creator as owner in space_members
                space_member = SpaceMemberModel(
                    space_id=space_model.id, user_id=user_id, member_role=MemberRole.OWNER
                )

                session.add(space_member)
                await session.commit()

                # Refresh the model (relationships eager loaded via lazy='selectin')
                await session.refresh(space_model)

                return Space.from_model(space_model)

            except IntegrityError as e:
                await session.rollback()

                # Handle slug uniqueness violation (idempotency for retries)
                # If slug already exists, return the existing space for this user
                if "unique_constraint" in str(e).lower() or "slug" in str(e).lower():
                    # Query for existing space with same slug owned by this user
                    # Relationships eager loaded via lazy='selectin' in model
                    existing_stmt = select(SpaceModel).where(
                        (SpaceModel.slug == slug) & (SpaceModel.owner_id == user_id)
                    )
                    existing_result = await session.execute(existing_stmt)
                    existing_space = existing_result.scalar_one_or_none()

                    if existing_space:
                        # Return existing space (idempotent behavior)
                        return Space.from_model(existing_space)

                # For other integrity errors, raise generic error
                msg = "Failed to create space due to database constraint"
                raise ValueError(msg)

        # Fallback if session doesn't yield for my MyPy
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.mutation
    async def update_space(
        self, info: strawberry.types.Info, id: strawberry.ID, input: UpdateSpaceInput
    ) -> Space | None:
        """
        Update an existing space.

        Args:
            id: The space ID
            input: Space update data (name, description, icon_color)

        Returns:
            The updated space if found, None otherwise

        Authorization:
            - Only owner or members with EDITOR role can update
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    return None

                user_id = user.id
                space_id = UUID(str(id))

                # Get space
                stmt = select(SpaceModel).where(SpaceModel.id == space_id)
                result = await session.execute(stmt)
                space_model = result.scalar_one_or_none()

                if not space_model:
                    return None

                # Check authorization: owner or editor
                is_owner = space_model.owner_id == user_id

                # Check if user is an editor member
                member_stmt = select(SpaceMemberModel).where(
                    (SpaceMemberModel.space_id == space_id)
                    & (SpaceMemberModel.user_id == user_id)
                    & (SpaceMemberModel.member_role == MemberRole.EDITOR)
                )
                member_result = await session.execute(member_stmt)
                is_editor = member_result.scalar_one_or_none() is not None

                if not is_owner and not is_editor:
                    msg = "Insufficient permissions to update this space"
                    raise ValueError(msg)

                # Update fields if provided
                if input.name is not None:
                    space_model.name = input.name
                if input.description is not None:
                    space_model.description = input.description
                if input.icon_color is not None:
                    space_model.icon_color = input.icon_color

                await session.commit()

                # Refresh the model (relationships eager loaded via lazy='selectin')
                await session.refresh(space_model)

                return Space.from_model(space_model)

            except ValueError as e:
                await session.rollback()
                # Re-raise authorization errors
                if "permissions" in str(e):
                    raise
                # Invalid UUID format
                return None

        return None

    @strawberry.mutation
    async def delete_space(self, info: strawberry.types.Info, id: strawberry.ID) -> bool:
        """
        Delete a space by ID.

        Args:
            id: The space ID

        Returns:
            True if deleted successfully, False otherwise

        Authorization:
            - Only the owner can delete a space
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    return False

                user_id = user.id
                space_id = UUID(str(id))

                # Get space
                stmt = select(SpaceModel).where(SpaceModel.id == space_id)
                result = await session.execute(stmt)
                space_model = result.scalar_one_or_none()

                if not space_model:
                    return False

                # Check authorization: only owner can delete
                if space_model.owner_id != user_id:
                    msg = "Only the owner can delete this space"
                    raise ValueError(msg)

                await session.delete(space_model)
                await session.commit()

                return True

            except ValueError as e:
                await session.rollback()
                # Re-raise authorization errors
                if "owner" in str(e):
                    raise
                # Invalid UUID format
                return False

        return False

    @strawberry.mutation
    async def delete_thread(self, info: strawberry.types.Info, id: strawberry.ID) -> bool:  # noqa: PLR0915
        """
        Delete a thread by ID.

        Args:
            id: The thread ID

        Returns:
            True if deleted successfully, False otherwise

        Authorization:
            - Only the thread creator or space owner can delete
            - For space threads: Must have access to the space containing the thread
            - For org-wide threads: Only creator or organization admin/owner can delete

        Example mutation:
            mutation {
              deleteThread(id: "thread-uuid")
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                thread_id = UUID(str(id))

                # Get thread
                stmt = select(ThreadModel).where(ThreadModel.id == thread_id)
                result = await session.execute(stmt)
                thread_model = result.scalar_one_or_none()

                if not thread_model:
                    msg = "Thread not found"
                    raise ValueError(msg)

                # Check authorization based on thread type
                is_creator = thread_model.created_by == user_id

                if thread_model.space_id:
                    # Space thread - check space permissions
                    space_stmt = select(SpaceModel).where(SpaceModel.id == thread_model.space_id)
                    space_result = await session.execute(space_stmt)
                    space_model = space_result.scalar_one_or_none()

                    if not space_model:
                        msg = "Space not found"
                        raise ValueError(msg)

                    is_owner = space_model.owner_id == user_id

                    # Check if user is a member of the space
                    member_stmt = select(SpaceMemberModel).where(
                        (SpaceMemberModel.space_id == thread_model.space_id)
                        & (SpaceMemberModel.user_id == user_id)
                    )
                    member_result = await session.execute(member_stmt)
                    is_member = member_result.scalar_one_or_none() is not None

                    if not is_creator and not is_owner and not is_member:
                        msg = "Insufficient permissions to delete this thread"
                        raise ValueError(msg)
                elif not is_creator:
                    # Check if user is organization admin or owner
                    org_member_stmt = select(OrganizationMemberModel).where(
                        (OrganizationMemberModel.organization_id == thread_model.organization_id)
                        & (OrganizationMemberModel.user_id == user_id)
                        & (
                            OrganizationMemberModel.organization_role.in_(
                                [OrganizationRole.ADMIN, OrganizationRole.OWNER]
                            )
                        )
                    )
                    org_member_result = await session.execute(org_member_stmt)
                    is_org_admin = org_member_result.scalar_one_or_none() is not None

                    if not is_org_admin:
                        msg = "Only the creator or organization admin can delete org-wide threads"
                        raise ValueError(msg)

                await session.delete(thread_model)
                await session.commit()

                return True

            except IntegrityError as e:
                await session.rollback()
                error_str = str(e).lower()

                # Parse IntegrityError and provide user-friendly messages
                # while hiding database schema details
                if "fk_threads_organization_id" in error_str:
                    msg = "Invalid organization specified"
                elif "fk_threads_space_id" in error_str or "fk_spaces_" in error_str:
                    msg = "Invalid space specified"
                elif "not-null constraint" in error_str:
                    msg = "Required field missing"
                elif "unique constraint" in error_str:
                    msg = "Duplicate entry already exists"
                else:
                    # Generic message for unknown integrity errors
                    msg = "Invalid data provided"

                logger.exception("IntegrityError in mutation")

                raise ValueError(msg) from e
            except ValueError:
                await session.rollback()
                raise  # Re-raise ValueError to propagate to GraphQL

        return False

    @strawberry.mutation
    async def create_thread(
        self, info: strawberry.types.Info, input: CreateThreadInput
    ) -> Thread | None:
        """
        Create a new thread manually (not via streaming).

        Args:
            input: CreateThreadInput with organization_id, optional space_id, query_text, and optional result/title

        Returns:
            The created Thread or None if creation fails

        Authorization:
            - User must have access to the organization
            - If space_id provided, user must have access to the space

        Example mutation:
            mutation {
              createThread(input: {
                organizationId: "org-uuid",
                spaceId: "space-uuid",
                queryText: "What are the key findings?",
                result: "The key findings are...",
                title: "Key Findings Thread"
              }) {
                id
                queryText
                result
              }
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                org_id = UUID(str(input.organization_id))
                space_id = UUID(str(input.space_id)) if input.space_id else None

                # TODO: Verify user has access to the organization (via organization_members)
                # For now, we just check space access if space_id is provided

                if space_id:
                    # Verify user has access to the space
                    stmt = select(SpaceModel).where(SpaceModel.id == space_id)
                    result = await session.execute(stmt)
                    space_model = result.scalar_one_or_none()

                    if not space_model:
                        msg = "Space not found"
                        raise ValueError(msg)

                    # Verify space belongs to the organization
                    if space_model.organization_id != org_id:
                        msg = "Space does not belong to the specified organization"
                        raise ValueError(msg)

                    # Check if user is owner or member
                    is_owner = space_model.owner_id == user_id
                    member_stmt = select(SpaceMemberModel).where(
                        (SpaceMemberModel.space_id == space_id)
                        & (SpaceMemberModel.user_id == user_id)
                    )
                    member_result = await session.execute(member_stmt)
                    is_member = member_result.scalar_one_or_none() is not None

                    if not is_owner and not is_member:
                        msg = "Insufficient permissions to create thread in this space"
                        raise ValueError(msg)

                # Create new thread
                thread_model = ThreadModel(
                    organization_id=org_id,
                    space_id=space_id,
                    created_by=user_id,
                    query_text=input.query_text,
                    result=input.result,
                    title=input.title,
                    confidence_score=input.confidence_score,
                )

                session.add(thread_model)
                await session.commit()
                await session.refresh(thread_model)

                return Thread.from_model(thread_model)

            except IntegrityError as e:
                await session.rollback()
                error_str = str(e).lower()

                # Parse IntegrityError and provide user-friendly messages
                # while hiding database schema details
                if "fk_threads_organization_id" in error_str:
                    msg = "Invalid organization specified"
                elif "fk_threads_space_id" in error_str or "fk_spaces_" in error_str:
                    msg = "Invalid space specified"
                elif "not-null constraint" in error_str:
                    msg = "Required field missing"
                elif "unique constraint" in error_str:
                    msg = "Duplicate entry already exists"
                else:
                    # Generic message for unknown integrity errors
                    msg = "Invalid data provided"

                logger.exception("IntegrityError in mutation")

                raise ValueError(msg) from e
            except ValueError:
                await session.rollback()
                raise  # Re-raise ValueError to propagate to GraphQL

        return None

    @strawberry.mutation
    async def update_thread(  # noqa: PLR0915
        self, info: strawberry.types.Info, id: strawberry.ID, input: UpdateThreadInput
    ) -> Thread | None:
        """
        Update an existing thread.

        Args:
            id: The thread ID
            input: UpdateThreadInput with optional title and result

        Returns:
            The updated Thread or None if update fails

        Authorization:
            - Only the thread creator or space owner can update (for space threads)
            - Only the thread creator or organization admin/owner can update org-wide threads

        Example mutation:
            mutation {
              updateThread(
                id: "thread-uuid",
                input: {
                  title: "Updated Title",
                  result: "Updated result text"
                }
              ) {
                id
                title
                result
              }
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                thread_id = UUID(str(id))

                # Get thread
                stmt = select(ThreadModel).where(ThreadModel.id == thread_id)
                result = await session.execute(stmt)
                thread_model = result.scalar_one_or_none()

                if not thread_model:
                    msg = "Thread not found"
                    raise ValueError(msg)

                # Check authorization based on thread type
                is_creator = thread_model.created_by == user_id

                if thread_model.space_id:
                    # Space thread - check space permissions
                    space_stmt = select(SpaceModel).where(SpaceModel.id == thread_model.space_id)
                    space_result = await session.execute(space_stmt)
                    space_model = space_result.scalar_one_or_none()

                    if not space_model:
                        msg = "Space not found"
                        raise ValueError(msg)

                    is_owner = space_model.owner_id == user_id

                    if not is_creator and not is_owner:
                        msg = "Insufficient permissions to update this thread"
                        raise ValueError(msg)
                elif not is_creator:
                    # Check if user is organization admin or owner
                    org_member_stmt = select(OrganizationMemberModel).where(
                        (OrganizationMemberModel.organization_id == thread_model.organization_id)
                        & (OrganizationMemberModel.user_id == user_id)
                        & (
                            OrganizationMemberModel.organization_role.in_(
                                [OrganizationRole.ADMIN, OrganizationRole.OWNER]
                            )
                        )
                    )
                    org_member_result = await session.execute(org_member_stmt)
                    is_org_admin = org_member_result.scalar_one_or_none() is not None

                    if not is_org_admin:
                        msg = "Only the creator or organization admin can update org-wide threads"
                        raise ValueError(msg)

                # Update fields if provided
                if input.title is not None:
                    thread_model.title = input.title
                if input.result is not None:
                    thread_model.result = input.result

                await session.commit()
                await session.refresh(thread_model)

                return Thread.from_model(thread_model)

            except IntegrityError as e:
                await session.rollback()
                error_str = str(e).lower()

                # Parse IntegrityError and provide user-friendly messages
                # while hiding database schema details
                if "fk_threads_organization_id" in error_str:
                    msg = "Invalid organization specified"
                elif "fk_threads_space_id" in error_str or "fk_spaces_" in error_str:
                    msg = "Invalid space specified"
                elif "not-null constraint" in error_str:
                    msg = "Required field missing"
                elif "unique constraint" in error_str:
                    msg = "Duplicate entry already exists"
                else:
                    # Generic message for unknown integrity errors
                    msg = "Invalid data provided"

                logger.exception("IntegrityError in mutation")

                raise ValueError(msg) from e
            except ValueError:
                await session.rollback()
                raise  # Re-raise ValueError to propagate to GraphQL

        return None
