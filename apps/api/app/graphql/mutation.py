"""GraphQL mutation resolvers."""

from uuid import UUID

import strawberry
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.session import get_session
from app.models.user import User as UserModel

from .types import CreateUserInput, UpdateUserInput, User


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
