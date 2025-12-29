"""add_thread_ownership_model

Revision ID: 60e29a1ed846
Revises: 8b9316dee492
Create Date: 2025-12-29 01:43:42.589626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60e29a1ed846'
down_revision: Union[str, Sequence[str], None] = '548de4f77dae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add thread ownership model."""

    # ============================================================
    # 1. Add new columns to threads table
    # ============================================================

    # Add owner_user_id (copy from created_by initially)
    op.execute("""
        ALTER TABLE threads
        ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE
    """)

    op.execute("""
        UPDATE threads
        SET owner_user_id = created_by
    """)

    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN owner_user_id SET NOT NULL
    """)

    op.execute("""
        CREATE INDEX idx_threads_owner_user_id ON threads(owner_user_id)
    """)

    # Add visibility column
    op.execute("""
        ALTER TABLE threads
        ADD COLUMN visibility VARCHAR(20) DEFAULT 'space'
    """)

    # Set visibility based on current state
    op.execute("""
        UPDATE threads
        SET visibility = CASE
            WHEN space_id IS NULL THEN 'org'
            ELSE 'space'
        END
    """)

    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN visibility SET NOT NULL
    """)

    op.execute("""
        CREATE INDEX idx_threads_visibility ON threads(visibility)
    """)

    # Make organization_id nullable (for personal threads)
    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN organization_id DROP NOT NULL
    """)

    # Add check constraints
    op.execute("""
        ALTER TABLE threads
        ADD CONSTRAINT space_visibility_requires_space
        CHECK ((visibility != 'space') OR (space_id IS NOT NULL))
    """)

    op.execute("""
        ALTER TABLE threads
        ADD CONSTRAINT org_visibility_requires_org
        CHECK ((visibility != 'org') OR (organization_id IS NOT NULL))
    """)

    # ============================================================
    # 2. Add author fields to messages table
    # ============================================================

    # Add author_user_id (copy from thread creator initially)
    op.execute("""
        ALTER TABLE messages
        ADD COLUMN author_user_id UUID REFERENCES users(id) ON DELETE SET NULL
    """)

    # For existing messages, set author based on message_role
    op.execute("""
        UPDATE messages m
        SET author_user_id = t.created_by
        FROM threads t
        WHERE m.thread_id = t.id
        AND m.message_role = 'user'
    """)

    op.execute("""
        CREATE INDEX idx_messages_author_user_id ON messages(author_user_id)
    """)

    # Add author_type column
    op.execute("""
        ALTER TABLE messages
        ADD COLUMN author_type VARCHAR(20) DEFAULT 'user'
    """)

    op.execute("""
        UPDATE messages
        SET author_type = CASE
            WHEN message_role = 'user' THEN 'user'
            WHEN message_role = 'assistant' THEN 'agent'
            ELSE 'system'
        END
    """)

    op.execute("""
        ALTER TABLE messages
        ALTER COLUMN author_type SET NOT NULL
    """)

    # ============================================================
    # 3. Add default_organization_id to users table
    # ============================================================

    op.execute("""
        ALTER TABLE users
        ADD COLUMN default_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
    """)

    # Set default org to first membership for existing users
    op.execute("""
        UPDATE users u
        SET default_organization_id = (
            SELECT organization_id
            FROM organization_members om
            WHERE om.user_id = u.id
            ORDER BY om.created_at ASC
            LIMIT 1
        )
    """)

    op.execute("""
        CREATE INDEX idx_users_default_organization_id ON users(default_organization_id)
    """)


def downgrade() -> None:
    """Downgrade schema - Remove thread ownership model."""

    # Drop users changes
    op.execute("DROP INDEX IF EXISTS idx_users_default_organization_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS default_organization_id")

    # Drop messages changes
    op.execute("ALTER TABLE messages DROP COLUMN IF EXISTS author_type")
    op.execute("DROP INDEX IF EXISTS idx_messages_author_user_id")
    op.execute("ALTER TABLE messages DROP COLUMN IF EXISTS author_user_id")

    # Drop threads changes
    op.execute("ALTER TABLE threads DROP CONSTRAINT IF EXISTS org_visibility_requires_org")
    op.execute("ALTER TABLE threads DROP CONSTRAINT IF EXISTS space_visibility_requires_space")
    op.execute("ALTER TABLE threads ALTER COLUMN organization_id SET NOT NULL")
    op.execute("DROP INDEX IF EXISTS idx_threads_visibility")
    op.execute("ALTER TABLE threads DROP COLUMN IF EXISTS visibility")
    op.execute("DROP INDEX IF EXISTS idx_threads_owner_user_id")
    op.execute("ALTER TABLE threads DROP COLUMN IF EXISTS owner_user_id")
