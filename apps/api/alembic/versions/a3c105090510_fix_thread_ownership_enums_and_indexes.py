"""fix thread ownership enums and indexes

This migration fixes thread ownership model to use PostgreSQL ENUMs instead of
VARCHAR, corrects default visibility to 'personal', and adds performance indexes.

Fixes identified in PR #65 review:
- Convert visibility/author_type to PostgreSQL ENUMs
- Change default visibility: 'space' → 'personal'
- Add personal visibility constraint
- Add compound indexes for query performance

Related: LOG-254
Revision ID: a3c105090510
Revises: 60e29a1ed846
Create Date: 2025-12-29 09:46:03.985603

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a3c105090510'
down_revision: Union[str, Sequence[str], None] = '60e29a1ed846'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix thread ownership model with ENUMs and indexes."""

    # ============================================================
    # 1. Create PostgreSQL ENUM types
    # ============================================================

    # Create thread_visibility ENUM
    thread_visibility_enum = postgresql.ENUM(
        'personal', 'space', 'organization',
        name='thread_visibility',
        create_type=False
    )
    thread_visibility_enum.create(op.get_bind(), checkfirst=True)

    # Create author_type ENUM
    author_type_enum = postgresql.ENUM(
        'user', 'agent', 'system',
        name='author_type',
        create_type=False
    )
    author_type_enum.create(op.get_bind(), checkfirst=True)

    # ============================================================
    # 2. Migrate threads.visibility column
    # ============================================================

    # Update existing 'org' values to 'organization' BEFORE type conversion
    op.execute("""
        UPDATE threads
        SET visibility = 'organization'
        WHERE visibility = 'org'
    """)

    # Drop existing default (required before type conversion)
    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN visibility DROP DEFAULT
    """)

    # Convert column type: VARCHAR(20) → thread_visibility ENUM
    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN visibility TYPE thread_visibility
        USING visibility::thread_visibility
    """)

    # Set new default to 'personal' (after type conversion)
    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN visibility SET DEFAULT 'personal'::thread_visibility
    """)

    # Update existing 'space' threads to 'personal' if they have no org/space
    # (This shouldn't happen with current data, but safe to include)
    op.execute("""
        UPDATE threads
        SET visibility = 'personal'
        WHERE visibility = 'space'
        AND organization_id IS NULL
        AND space_id IS NULL
    """)

    # ============================================================
    # 3. Migrate messages.author_type column
    # ============================================================

    # Drop existing default (if any) before type conversion
    op.execute("""
        ALTER TABLE messages
        ALTER COLUMN author_type DROP DEFAULT
    """)

    # Convert column type: VARCHAR(20) → author_type ENUM
    op.execute("""
        ALTER TABLE messages
        ALTER COLUMN author_type TYPE author_type
        USING author_type::author_type
    """)

    # ============================================================
    # 4. Add missing constraints
    # ============================================================

    # Personal threads cannot have org or space
    op.execute("""
        ALTER TABLE threads
        ADD CONSTRAINT personal_visibility_no_org_space
        CHECK (
            (visibility != 'personal') OR
            (organization_id IS NULL AND space_id IS NULL)
        )
    """)

    # ============================================================
    # 5. Add compound indexes for performance
    # ============================================================

    # Index for "my threads" queries filtered by visibility
    op.execute("""
        CREATE INDEX idx_threads_owner_visibility
        ON threads(owner_user_id, visibility)
    """)

    # Index for personal threads (most common query: user's personal threads)
    op.execute("""
        CREATE INDEX idx_threads_personal
        ON threads(owner_user_id)
        WHERE visibility = 'personal'
    """)

    # Index for org-scoped queries (exclude personal threads)
    op.execute("""
        CREATE INDEX idx_threads_org_visibility
        ON threads(organization_id, visibility)
        WHERE organization_id IS NOT NULL
    """)

    # Index for space-scoped queries (exclude personal/org threads)
    op.execute("""
        CREATE INDEX idx_threads_space_visibility
        ON threads(space_id, visibility)
        WHERE space_id IS NOT NULL
    """)

    # Index for multi-org user scenarios
    op.execute("""
        CREATE INDEX idx_threads_owner_org
        ON threads(owner_user_id, organization_id)
        WHERE organization_id IS NOT NULL
    """)


def downgrade() -> None:
    """Revert thread ownership model fixes."""

    # Drop compound indexes
    op.execute("DROP INDEX IF EXISTS idx_threads_owner_org")
    op.execute("DROP INDEX IF EXISTS idx_threads_space_visibility")
    op.execute("DROP INDEX IF EXISTS idx_threads_org_visibility")
    op.execute("DROP INDEX IF EXISTS idx_threads_personal")
    op.execute("DROP INDEX IF EXISTS idx_threads_owner_visibility")

    # Drop constraint
    op.execute("ALTER TABLE threads DROP CONSTRAINT IF EXISTS personal_visibility_no_org_space")

    # Revert messages.author_type to VARCHAR
    op.execute("""
        ALTER TABLE messages
        ALTER COLUMN author_type TYPE VARCHAR(20)
        USING author_type::text
    """)

    # Revert threads.visibility to VARCHAR with 'space' default
    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN visibility TYPE VARCHAR(20)
        USING visibility::text
    """)

    op.execute("""
        ALTER TABLE threads
        ALTER COLUMN visibility SET DEFAULT 'space'
    """)

    # Drop ENUM types (only if no other tables use them)
    author_type_enum = postgresql.ENUM('user', 'agent', 'system', name='author_type')
    author_type_enum.drop(op.get_bind(), checkfirst=True)

    thread_visibility_enum = postgresql.ENUM('personal', 'space', 'organization', name='thread_visibility')
    thread_visibility_enum.drop(op.get_bind(), checkfirst=True)
