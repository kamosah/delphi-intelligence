"""add_browser_notifications_preference

Add browser_notifications_enabled field to user_preferences table.
This field tracks whether users want browser notifications for streaming completion:
- NULL: User has not been prompted yet (first-time)
- TRUE: User enabled browser notifications
- FALSE: User declined or disabled browser notifications

Revision ID: 76fb1befddff
Revises: a95d41dc7f4f
Create Date: 2025-11-21 20:54:39.008234

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '76fb1befddff'
down_revision: Union[str, Sequence[str], None] = 'a95d41dc7f4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add browser_notifications_enabled column to user_preferences table."""
    op.execute("""
        ALTER TABLE user_preferences
        ADD COLUMN IF NOT EXISTS browser_notifications_enabled BOOLEAN DEFAULT NULL;
    """)


def downgrade() -> None:
    """Remove browser_notifications_enabled column from user_preferences table."""
    op.execute("""
        ALTER TABLE user_preferences
        DROP COLUMN IF EXISTS browser_notifications_enabled;
    """)
