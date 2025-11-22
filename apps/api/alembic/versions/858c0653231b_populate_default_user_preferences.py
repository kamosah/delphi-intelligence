"""populate_default_user_preferences

Populate default UserPreferences for all existing users.

This migration creates default preference records for any users that don't
already have preferences. Default values:
- theme: 'light'
- notifications_enabled: false
- email_notifications: false
- browser_notifications_enabled: NULL (not prompted yet)
- language: 'en'

Revision ID: 858c0653231b
Revises: 76fb1befddff
Create Date: 2025-11-22 00:09:58.017429

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '858c0653231b'
down_revision: Union[str, Sequence[str], None] = '76fb1befddff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create default preferences for all users without preferences."""
    op.execute("""
        INSERT INTO user_preferences (
            user_id,
            theme,
            notifications_enabled,
            email_notifications,
            browser_notifications_enabled,
            language,
            custom_settings,
            created_at,
            updated_at
        )
        SELECT
            u.id,
            'light',
            false,
            false,
            NULL,
            'en',
            NULL,
            NOW(),
            NOW()
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE up.id IS NULL;
    """)


def downgrade() -> None:
    """Remove default preferences created by this migration.

    Note: This only removes preferences with default values to avoid
    deleting user-customized preferences.
    """
    op.execute("""
        DELETE FROM user_preferences
        WHERE theme = 'light'
        AND notifications_enabled = false
        AND email_notifications = false
        AND browser_notifications_enabled IS NULL
        AND language = 'en'
        AND custom_settings IS NULL;
    """)
