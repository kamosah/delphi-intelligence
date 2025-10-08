"""User preferences model for storing user settings and preferences."""

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class UserPreferences(Base):
    """User preferences model for storing user settings."""

    __tablename__ = "user_preferences"

    # Foreign key to user
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True,  # One preference record per user
        index=True,
    )

    # Preference fields
    theme: Mapped[str] = mapped_column(String(20), default="light", nullable=False)

    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # JSON field for flexible additional preferences
    custom_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationship to user
    user: Mapped["User"] = relationship("User", back_populates="preferences")

    def __repr__(self) -> str:
        """String representation of user preferences."""
        return f"<UserPreferences(user_id={self.user_id}, theme={self.theme})>"
