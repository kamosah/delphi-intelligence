"""GraphQL types for the application."""

from datetime import datetime

import strawberry

from app.models.user import User as UserModel


@strawberry.type
class User:
    """GraphQL User type."""

    id: strawberry.ID
    email: str
    full_name: str | None
    avatar_url: str | None
    bio: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, user: UserModel) -> "User":
        """Convert SQLAlchemy User model to GraphQL User type."""
        return cls(
            id=strawberry.ID(str(user.id)),
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            bio=user.bio,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )


@strawberry.input
class CreateUserInput:
    """Input type for creating a new user."""

    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


@strawberry.input
class UpdateUserInput:
    """Input type for updating an existing user."""

    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
