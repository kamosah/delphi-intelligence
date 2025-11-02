"""GraphQL mutation resolvers."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import strawberry

from app.db.session import get_session
from app.models.query import Query as QueryModel
from app.models.space import MemberRole, Space as SpaceModel, SpaceMember as SpaceMemberModel
from app.models.user import User as UserModel
from app.utils.slug import generate_unique_slug

from .types import (
    CreateQueryInput,
    CreateSpaceInput,
    CreateUserInput,
    QueryResult,
    Space,
    UpdateQueryInput,
    UpdateSpaceInput,
    UpdateUserInput,
    User,
)


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
    async def delete_query(self, info: strawberry.types.Info, id: strawberry.ID) -> bool:
        """
        Delete a query by ID.

        Args:
            id: The query ID

        Returns:
            True if deleted successfully, False otherwise

        Authorization:
            - Only the query creator or space owner can delete
            - Must have access to the space containing the query

        Example mutation:
            mutation {
              deleteQuery(id: "query-uuid")
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    return False

                user_id = user.id
                query_id = UUID(str(id))

                # Get query with space information
                stmt = (
                    select(QueryModel)
                    .join(SpaceModel, SpaceModel.id == QueryModel.space_id)
                    .where(QueryModel.id == query_id)
                )
                result = await session.execute(stmt)
                query_model = result.scalar_one_or_none()

                if not query_model:
                    return False

                # Check authorization: creator, space owner, or space member
                is_creator = query_model.created_by == user_id
                is_owner = query_model.space.owner_id == user_id

                # Check if user is a member of the space
                member_stmt = select(SpaceMemberModel).where(
                    (SpaceMemberModel.space_id == query_model.space_id)
                    & (SpaceMemberModel.user_id == user_id)
                )
                member_result = await session.execute(member_stmt)
                is_member = member_result.scalar_one_or_none() is not None

                if not is_creator and not is_owner and not is_member:
                    msg = "Insufficient permissions to delete this query"
                    raise ValueError(msg)

                await session.delete(query_model)
                await session.commit()

                return True

            except ValueError as e:
                await session.rollback()
                # Re-raise authorization errors
                if "permissions" in str(e):
                    raise
                # Invalid UUID format
                return False

        return False

    @strawberry.mutation
    async def create_query(
        self, info: strawberry.types.Info, input: CreateQueryInput
    ) -> QueryResult | None:
        """
        Create a new query manually (not via streaming).

        Args:
            input: CreateQueryInput with space_id, query_text, and optional result/title

        Returns:
            The created QueryResult or None if creation fails

        Authorization:
            - User must have access to the space

        Example mutation:
            mutation {
              createQuery(input: {
                spaceId: "space-uuid",
                queryText: "What are the key findings?",
                result: "The key findings are...",
                title: "Key Findings Query"
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
                    return None

                user_id = user.id
                space_id = UUID(str(input.space_id))

                # Verify user has access to the space
                stmt = select(SpaceModel).where(SpaceModel.id == space_id)
                result = await session.execute(stmt)
                space_model = result.scalar_one_or_none()

                if not space_model:
                    return None

                # Check if user is owner or member
                is_owner = space_model.owner_id == user_id
                member_stmt = select(SpaceMemberModel).where(
                    (SpaceMemberModel.space_id == space_id) & (SpaceMemberModel.user_id == user_id)
                )
                member_result = await session.execute(member_stmt)
                is_member = member_result.scalar_one_or_none() is not None

                if not is_owner and not is_member:
                    msg = "Insufficient permissions to create query in this space"
                    raise ValueError(msg)

                # Create new query
                query_model = QueryModel(
                    space_id=space_id,
                    created_by=user_id,
                    query_text=input.query_text,
                    result=input.result,
                    title=input.title,
                    confidence_score=input.confidence_score,
                )

                session.add(query_model)
                await session.commit()
                await session.refresh(query_model)

                return QueryResult.from_model(query_model)

            except (ValueError, IntegrityError):
                await session.rollback()
                return None

        return None

    @strawberry.mutation
    async def update_query(
        self, info: strawberry.types.Info, id: strawberry.ID, input: UpdateQueryInput
    ) -> QueryResult | None:
        """
        Update an existing query.

        Args:
            id: The query ID
            input: UpdateQueryInput with optional title and result

        Returns:
            The updated QueryResult or None if update fails

        Authorization:
            - Only the query creator or space owner can update

        Example mutation:
            mutation {
              updateQuery(
                id: "query-uuid",
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
                    return None

                user_id = user.id
                query_id = UUID(str(id))

                # Get query with space information
                stmt = (
                    select(QueryModel)
                    .join(SpaceModel, SpaceModel.id == QueryModel.space_id)
                    .where(QueryModel.id == query_id)
                )
                result = await session.execute(stmt)
                query_model = result.scalar_one_or_none()

                if not query_model:
                    return None

                # Check authorization: creator or space owner
                is_creator = query_model.created_by == user_id
                is_owner = query_model.space.owner_id == user_id

                if not is_creator and not is_owner:
                    msg = "Insufficient permissions to update this query"
                    raise ValueError(msg)

                # Update fields if provided
                if input.title is not None:
                    query_model.title = input.title
                if input.result is not None:
                    query_model.result = input.result

                await session.commit()
                await session.refresh(query_model)

                return QueryResult.from_model(query_model)

            except ValueError:
                await session.rollback()
                return None

        return None
