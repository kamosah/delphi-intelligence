"""User preferences model for storing user settings and preferences."""

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .organization import Organization
    from .user import User


class UserPreferences(Base):
    """User preferences model for storing user settings."""

    __tablename__ = "user_preferences"

    # Override id from Base to use Integer (legacy Supabase schema)
    # Note: Supabase uses integer ID for this table, not UUID
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)  # type: ignore[assignment]

    # Foreign key to user
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        unique=True,  # One preference record per user
        index=True,
    )

    # Preference fields
    theme: Mapped[str] = mapped_column(String(20), default="light", nullable=False)

    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    browser_notifications_enabled: Mapped[bool | None] = mapped_column(
        Boolean, default=None, nullable=True
    )

    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # JSON field for flexible additional preferences
    custom_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Current organization selection
    current_organization_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="preferences")
    current_organization: Mapped["Organization | None"] = relationship(
        "Organization",
        foreign_keys=[current_organization_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        """String representation of user preferences."""
        return f"<UserPreferences(user_id={self.user_id}, theme={self.theme})>"
