"""add_user_preferences_fields

Add missing fields to user_preferences table to match SQLAlchemy model.

Fields added:
- email_notifications: Boolean field for email notification preferences
- timezone: Optional string field for user timezone (e.g., 'America/New_York')
- custom_settings: Optional JSONB field for flexible additional preferences

This is part of LOG-160 Task 2: Clean up schema differences.

Revision ID: 20251025_add_user_prefs
Revises: 20251025_remove_joined_at
Create Date: 2025-10-25 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251025_add_user_prefs'
down_revision: Union[str, Sequence[str], None] = '20251025_remove_joined_at'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing fields to user_preferences table."""

    # Add email_notifications field (Boolean, default true, not null)
    op.execute("""
        ALTER TABLE user_preferences
        ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true NOT NULL;
    """)

    # Add timezone field (String(50), nullable)
    op.execute("""
        ALTER TABLE user_preferences
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
    """)

    # Add custom_settings field (JSONB, nullable)
    op.execute("""
        ALTER TABLE user_preferences
        ADD COLUMN IF NOT EXISTS custom_settings JSONB;
    """)

    print("✅ Added missing fields to user_preferences:")
    print("   - email_notifications (BOOLEAN DEFAULT true NOT NULL)")
    print("   - timezone (VARCHAR(50) NULL)")
    print("   - custom_settings (JSONB NULL)")


def downgrade() -> None:
    """Remove added fields from user_preferences table."""

    op.execute("""
        ALTER TABLE user_preferences
        DROP COLUMN IF EXISTS custom_settings;
    """)

    op.execute("""
        ALTER TABLE user_preferences
        DROP COLUMN IF EXISTS timezone;
    """)

    op.execute("""
        ALTER TABLE user_preferences
        DROP COLUMN IF EXISTS email_notifications;
    """)

    print("⏮️ Removed user_preferences fields:")
    print("   - email_notifications")
    print("   - timezone")
    print("   - custom_settings")
