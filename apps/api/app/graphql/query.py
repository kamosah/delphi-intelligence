"""GraphQL query resolvers."""

from uuid import UUID

import strawberry
from sqlalchemy import select

from app.db.session import get_session
from app.models.user import User as UserModel

from .types import User


@strawberry.type
class Query:
    """GraphQL query root."""

    @strawberry.field
    async def user(self, id: strawberry.ID) -> User | None:
        """Get a user by ID."""
        async for session in get_session():
            try:
                user_id = UUID(str(id))
                stmt = select(UserModel).where(UserModel.id == user_id)
                result = await session.execute(stmt)
                user_model = result.scalar_one_or_none()

                if user_model:
                    return User.from_model(user_model)
                return None
            except ValueError:
                # Invalid UUID format
                return None

    @strawberry.field
    async def users(self, limit: int = 10, offset: int = 0) -> list[User]:
        """Get a list of users with pagination."""
        async for session in get_session():
            stmt = select(UserModel).limit(limit).offset(offset)
            result = await session.execute(stmt)
            user_models = result.scalars().all()

            return [User.from_model(user) for user in user_models]

    @strawberry.field
    async def user_by_email(self, email: str) -> User | None:
        """Get a user by email address."""
        async for session in get_session():
            stmt = select(UserModel).where(UserModel.email == email)
            result = await session.execute(stmt)
            user_model = result.scalar_one_or_none()

            if user_model:
                return User.from_model(user_model)
            return None

    @strawberry.field
    async def health(self) -> str:
        """Health check endpoint for GraphQL."""
        return "GraphQL API is healthy!"
