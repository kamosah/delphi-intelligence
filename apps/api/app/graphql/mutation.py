"""GraphQL mutation resolvers."""

import logging
from uuid import UUID

import strawberry
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.session import get_session
from app.models.document import Document as DocumentModel
from app.models.organization import Organization as OrganizationModel
from app.models.organization_invitation import (
    OrganizationInvitation as OrganizationInvitationModel,
)
from app.models.organization_member import (
    OrganizationMember as OrganizationMemberModel,
    OrganizationRole,
)
from app.models.space import MemberRole, Space as SpaceModel, SpaceMember as SpaceMemberModel
from app.models.thread import Thread as ThreadModel, ThreadVisibility
from app.models.user import User as UserModel
from app.models.user_preferences import UserPreferences as UserPreferencesModel
from app.schemas.spicedb import CheckPermissionInput
from app.services.invitation_service import InvitationService
from app.services.organization_service import OrganizationService
from app.services.spicedb_service import get_spicedb_service
from app.services.storage_service import get_storage_service
from app.utils.slug import generate_unique_slug

from .types import (
    AddOrganizationMemberInput,
    BulkDeleteDocumentsInput,
    BulkDeleteResult,
    CreateOrganizationInput,
    CreateSpaceInput,
    CreateThreadInput,
    CreateUserInput,
    DeleteDocumentInput,
    InviteOrganizationMemberInput,
    Organization,
    OrganizationInvitation,
    OrganizationMember,
    OrganizationRole as OrganizationRoleType,
    Space,
    SwitchOrganizationInput,
    Thread,
    UpdateOrganizationInput,
    UpdateSpaceInput,
    UpdateThreadInput,
    UpdateUserInput,
    UpdateUserPreferencesInput,
    User,
    UserPreferences,
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="manage_settings",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="delete",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to delete this organization"
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(current_user_id),
                        permission="invite_member",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(current_user_id),
                        permission="remove_member",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
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
    async def invite_organization_member(
        self, info: strawberry.types.Info, input: InviteOrganizationMemberInput
    ) -> OrganizationInvitation:
        """
        Invite a user to join an organization via email.

        Args:
            input: Invitation details (email, role, custom message)

        Returns:
            Created invitation

        Authorization:
            - Owner or admins can invite members

        Raises:
            ValueError: Invalid email, duplicate invitation, or Supabase error
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                org_id = UUID(str(input.organization_id))

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user.id),
                        permission="invite_member",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to invite members to this organization"
                    raise ValueError(msg)

                # Create invitation via service
                invitation = await InvitationService.create_invitation(
                    db=session,
                    organization_id=org_id,
                    inviter_id=user.id,
                    invitee_email=input.invitee_email,
                    role=OrganizationRole(input.role.value),
                    custom_message=input.custom_message,
                )

                return OrganizationInvitation.from_model(invitation)

            except ValueError:
                await session.rollback()
                raise

        # Fallback if session doesn't yield
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.mutation
    async def accept_invitation(
        self, info: strawberry.types.Info, invitation_id: strawberry.ID
    ) -> OrganizationMember:
        """
        Accept an organization invitation.

        Args:
            invitation_id: Invitation ID to accept

        Returns:
            Created organization membership

        Authorization:
            - Email must match authenticated user (verified in service)

        Raises:
            ValueError: Invitation not found, expired, or email mismatch
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                # Accept invitation (email verification happens inside service)
                membership = await InvitationService.accept_invitation(
                    db=session,
                    invitation_id=UUID(str(invitation_id)),
                    user_id=user.id,
                )

                return OrganizationMember.from_model(membership)

            except ValueError:
                await session.rollback()
                raise

        # Fallback if session doesn't yield
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.mutation
    async def revoke_invitation(
        self, info: strawberry.types.Info, invitation_id: strawberry.ID
    ) -> bool:
        """
        Revoke a pending organization invitation.

        Args:
            invitation_id: Invitation ID to revoke

        Returns:
            True if revoked successfully

        Authorization:
            - Owner or admins can revoke invitations

        Raises:
            ValueError: Invitation not found or not pending
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                # Get invitation to check organization
                invitation_stmt = select(OrganizationInvitationModel).where(
                    OrganizationInvitationModel.id == UUID(str(invitation_id))
                )
                invitation_result = await session.execute(invitation_stmt)
                invitation = invitation_result.scalar_one_or_none()

                if not invitation:
                    msg = "Invitation not found"
                    raise ValueError(msg)

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user.id),
                        permission="manage_settings",
                        resource_type="organization",
                        resource_id=str(invitation.organization_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to revoke invitations"
                    raise ValueError(msg)

                # Revoke invitation
                success = await InvitationService.revoke_invitation(
                    db=session,
                    invitation_id=UUID(str(invitation_id)),
                    revoker_id=user.id,
                )

                return success

            except ValueError:
                await session.rollback()
                raise

        return False

    @strawberry.mutation
    async def switch_organization(
        self, info: strawberry.types.Info, input: SwitchOrganizationInput
    ) -> Organization:
        """
        Switch user's current organization.

        Updates organization_members.is_default and last_active_at.

        Args:
            input: Organization ID to switch to

        Returns:
            The selected organization with updated membership data

        Raises:
            ValueError: If user is not a member of the organization
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

                # Switch organization using service
                await OrganizationService.switch_organization(
                    user_id=user_id, new_org_id=org_id, db=session
                )

                # Fetch the organization
                org_stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
                result = await session.execute(org_stmt)
                org_model = result.scalar_one_or_none()

                if not org_model:
                    msg = "Organization not found"
                    raise ValueError(msg)

                # Fetch the user's membership for this organization
                membership_stmt = select(OrganizationMemberModel).where(
                    OrganizationMemberModel.user_id == user_id,
                    OrganizationMemberModel.organization_id == org_id,
                )
                membership_result = await session.execute(membership_stmt)
                membership = membership_result.scalar_one_or_none()

                # Return organization with membership data
                return Organization.from_model(org_model, membership)

            except ValueError:
                await session.rollback()
                raise

        msg = "Database session unavailable"
        raise RuntimeError(msg)

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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(current_user_id),
                        permission="manage_settings",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to update member roles"
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
                organization_id = UUID(str(input.organization_id))

                # Generate unique slug from space name
                slug = await generate_unique_slug(input.name, session, SpaceModel)

                # Create new space instance
                space_model = SpaceModel(
                    organization_id=organization_id,
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="update",
                        resource_type="space",
                        resource_id=str(space_id),
                    )
                )

                if not has_permission:
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="delete",
                        resource_type="space",
                        resource_id=str(space_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to delete this space"
                    raise ValueError(msg)

                await session.delete(space_model)
                await session.commit()

                # Cleanup SpiceDB relationships
                if not await spicedb.delete_all_relationships_for_resource("space", str(space_id)):
                    logger.warning(
                        "Failed to delete SpiceDB relationships for space",
                        extra={"space_id": str(space_id)},
                    )

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
    async def delete_thread(self, info: strawberry.types.Info, id: strawberry.ID) -> bool:
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="delete",
                        resource_type="thread",
                        resource_id=str(thread_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to delete this thread"
                    raise ValueError(msg)

                await session.delete(thread_model)
                await session.commit()

                # Cleanup SpiceDB relationships
                if not await spicedb.remove_thread_relationships(str(thread_id)):
                    logger.warning(
                        "Failed to delete thread relationships from SpiceDB",
                        extra={"thread_id": str(thread_id)},
                    )

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
    async def create_thread(  # noqa: PLR0915
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
                org_id = UUID(str(input.organization_id)) if input.organization_id else None
                space_id = UUID(str(input.space_id)) if input.space_id else None

                # Convert visibility (REQUIRED field)
                visibility = ThreadVisibility(input.visibility.value)

                # Validate visibility rules
                if visibility == ThreadVisibility.PERSONAL:
                    if org_id or space_id:
                        msg = "Personal threads cannot have organization or space"
                        raise ValueError(msg)
                elif visibility == ThreadVisibility.SPACE:
                    if not space_id:
                        msg = "Space threads must have space_id"
                        raise ValueError(msg)
                elif visibility == ThreadVisibility.ORGANIZATION:
                    if not org_id:
                        msg = "Organization threads must have organization_id"
                        raise ValueError(msg)
                    if space_id:
                        msg = "Organization threads cannot have space_id"
                        raise ValueError(msg)

                # ONLY verify org membership if org_id provided
                if org_id:
                    org_member_stmt = select(OrganizationMemberModel).where(
                        OrganizationMemberModel.organization_id == org_id,
                        OrganizationMemberModel.user_id == user_id,
                    )
                    org_member_result = await session.execute(org_member_stmt)
                    org_member = org_member_result.scalar_one_or_none()

                    if not org_member:
                        msg = "User is not a member of this organization"
                        raise ValueError(msg)

                # If space_id is provided (space thread), verify space access
                if space_id:
                    # Verify space exists and belongs to the organization
                    stmt = select(SpaceModel).where(SpaceModel.id == space_id)
                    result = await session.execute(stmt)
                    space_model = result.scalar_one_or_none()

                    if not space_model:
                        msg = "Space not found"
                        raise ValueError(msg)

                    if space_model.organization_id != org_id:
                        msg = "Space does not belong to the specified organization"
                        raise ValueError(msg)

                    # Check authorization via SpiceDB
                    # Use "update" permission to ensure user has write access (owner/editor role)
                    # Prevents space viewers from creating threads (they can only read)
                    spicedb = get_spicedb_service()
                    has_permission = await spicedb.check_permission(
                        CheckPermissionInput(
                            user_id=str(user_id),
                            permission="update",
                            resource_type="space",
                            resource_id=str(space_id),
                        )
                    )

                    if not has_permission:
                        msg = "Insufficient permissions to create thread in this space. Must be space owner or editor."
                        raise ValueError(msg)

                # Create new thread with ownership fields
                thread_model = ThreadModel(
                    owner_user_id=user_id,  # NEW: Set owner explicitly
                    visibility=visibility,  # NEW: Set visibility explicitly
                    organization_id=org_id,  # Can be None for personal threads
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

                # Sync to SpiceDB ONLY for org/space threads
                # Personal threads use PostgreSQL RLS (migration 19f86983628b)
                if org_id:
                    spicedb = get_spicedb_service()
                    sync_success = await spicedb.sync_thread_relationships(
                        thread_id=str(thread_model.id),
                        organization_id=str(org_id),
                        owner_id=str(user_id),
                        space_id=str(space_id) if space_id else None,
                    )

                    if not sync_success:
                        # CRITICAL: Rollback thread creation if authorization sync fails
                        # We cannot allow threads to exist without proper access control
                        await session.rollback()
                        logger.error(
                            "Failed to sync thread relationships to SpiceDB - rolling back transaction",
                            extra={"thread_id": str(thread_model.id)},
                        )
                        msg = "Failed to configure thread permissions. Please try again."
                        raise ValueError(msg)

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
    async def update_user_preferences(
        self, info: strawberry.types.Info, input: UpdateUserPreferencesInput
    ) -> UserPreferences:
        """Update preferences for the authenticated user."""
        request = info.context["request"]
        user = getattr(request.state, "user", None)

        if not user:
            msg = "Authentication required"
            raise ValueError(msg)

        async for session in get_session():
            try:
                user_id = UUID(str(user.id))

                # Fetch existing preferences or create new one
                stmt = select(UserPreferencesModel).where(UserPreferencesModel.user_id == user_id)
                result = await session.execute(stmt)
                preferences_model = result.scalar_one_or_none()

                if not preferences_model:
                    # Create new preferences if they don't exist
                    preferences_model = UserPreferencesModel(user_id=user_id)
                    session.add(preferences_model)

                # Update only provided fields
                if input.theme is not None:
                    preferences_model.theme = input.theme
                if input.notifications_enabled is not None:
                    preferences_model.notifications_enabled = input.notifications_enabled
                if input.email_notifications is not None:
                    preferences_model.email_notifications = input.email_notifications
                if input.browser_notifications_enabled is not None:
                    preferences_model.browser_notifications_enabled = (
                        input.browser_notifications_enabled
                    )
                if input.language is not None:
                    preferences_model.language = input.language
                if input.timezone is not None:
                    preferences_model.timezone = input.timezone
                if input.custom_settings is not None:
                    # Mypy false positive: thinks this line is unreachable but it's valid when custom_settings is provided
                    preferences_model.custom_settings = input.custom_settings  # type: ignore[unreachable]

                await session.commit()
                await session.refresh(preferences_model)

                logger.info(f"Updated preferences for user {user_id}")
                return UserPreferences.from_model(preferences_model)

            except Exception as e:
                await session.rollback()
                logger.exception("Error updating user preferences")
                raise ValueError(f"Failed to update preferences: {str(e)}") from e

        msg = "Failed to get database session"
        raise ValueError(msg)

    @strawberry.mutation
    async def update_thread(
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

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="update",
                        resource_type="thread",
                        resource_id=str(thread_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to update this thread"
                    raise ValueError(msg)

                # Update fields if provided
                if input.title is not None:
                    thread_model.title = input.title
                if input.result is not None:
                    thread_model.result = input.result
                if input.is_starred is not None:
                    thread_model.is_starred = input.is_starred

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
    async def delete_document(
        self, info: strawberry.types.Info, input: DeleteDocumentInput
    ) -> bool:
        """
        Delete a document.

        Args:
            input: DeleteDocumentInput with document_id and space_id

        Returns:
            True if deleted successfully, False otherwise

        Authorization:
            - User must have permission to delete from the document's space
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                document_id = UUID(str(input.document_id))
                space_id = UUID(str(input.space_id))

                # Get document
                stmt = select(DocumentModel).where(DocumentModel.id == document_id)
                result = await session.execute(stmt)
                document = result.scalar_one_or_none()

                if not document:
                    msg = "Document not found"
                    raise ValueError(msg)

                # Verify document belongs to the specified space
                if document.space_id != space_id:
                    msg = "Document does not belong to the specified space"
                    raise ValueError(msg)

                # Check authorization via SpiceDB
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user.id),
                        permission="upload_document",
                        resource_type="space",
                        resource_id=str(space_id),
                    )
                )

                if not has_permission:
                    msg = "Insufficient permissions to delete this document"
                    raise ValueError(msg)

                # Step 1: Delete from database FIRST (can be rolled back if commit fails)
                await session.delete(document)

                # Step 2: Commit database changes
                await session.commit()

                # Step 3: THEN delete from storage (best effort - can't be rolled back)
                try:
                    await get_storage_service().delete_file(document.file_path)
                except Exception as e:
                    logger.exception(
                        f"ORPHANED FILE: Failed to delete {document.file_path} "
                        f"for document {document.id}: {e}",
                        extra={"document_id": str(document.id), "file_path": document.file_path},
                    )

                return True

            except ValueError:
                await session.rollback()
                raise

        return False

    @strawberry.mutation
    async def bulk_delete_documents(
        self, info: strawberry.types.Info, input: BulkDeleteDocumentsInput
    ) -> BulkDeleteResult:
        """
        Delete multiple documents in a single transaction.

        Args:
            input: BulkDeleteDocumentsInput with list of document IDs

        Returns:
            BulkDeleteResult with count of deleted documents and list of failed IDs

        Authorization:
            - User must have permission to delete from each document's space
            - Documents without permission are added to failed_ids
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                if not input.document_ids:
                    msg = "No document IDs provided"
                    raise ValueError(msg)

                # Parse all document IDs
                doc_uuids = [UUID(str(doc_id)) for doc_id in input.document_ids]

                # Get all documents
                stmt = select(DocumentModel).where(DocumentModel.id.in_(doc_uuids))
                result = await session.execute(stmt)
                documents = result.scalars().all()

                if not documents:
                    return BulkDeleteResult(deleted_count=0, failed_ids=input.document_ids)

                # Check permissions via SpiceDB for each unique space
                spicedb = get_spicedb_service()
                unique_space_ids = list({doc.space_id for doc in documents})

                # Check permissions for each unique space
                space_permissions = {}
                for space_id in unique_space_ids:
                    has_permission = await spicedb.check_permission(
                        CheckPermissionInput(
                            user_id=str(user.id),
                            permission="upload_document",
                            resource_type="space",
                            resource_id=str(space_id),
                        )
                    )
                    space_permissions[space_id] = has_permission

                # Filter documents based on permission results
                failed_ids = []
                documents_to_delete = []

                for document in documents:
                    if not space_permissions.get(document.space_id, False):
                        failed_ids.append(strawberry.ID(str(document.id)))
                    else:
                        documents_to_delete.append(document)

                # Step 1: Delete from database FIRST (can be rolled back if commit fails)
                for document in documents_to_delete:
                    await session.delete(document)

                # Step 2: Commit database changes
                await session.commit()

                # Step 3: THEN delete from storage (best effort - can't be rolled back)
                # If this fails, we have orphaned files but DB is consistent
                # Background cleanup job can reconcile later
                storage_failures = []
                for document in documents_to_delete:
                    try:
                        await get_storage_service().delete_file(document.file_path)
                    except Exception as e:
                        logger.exception(
                            f"ORPHANED FILE: Failed to delete {document.file_path} "
                            f"for document {document.id}: {e}",
                            extra={
                                "document_id": str(document.id),
                                "file_path": document.file_path,
                            },
                        )
                        storage_failures.append(strawberry.ID(str(document.id)))

                return BulkDeleteResult(
                    deleted_count=len(documents_to_delete),
                    failed_ids=failed_ids,
                    storage_failures=storage_failures,
                )

            except ValueError:
                await session.rollback()
                raise

        return BulkDeleteResult(deleted_count=0, failed_ids=[])
