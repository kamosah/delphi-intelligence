"""add icon_color field to spaces table

Revision ID: 20251022_add_icon_color
Revises: 20251020_add_confidence_score
Create Date: 2025-10-22 00:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20251022_add_icon_color"  # noqa: F841
down_revision: Union[str, Sequence[str], None] = "20251020_add_confidence_score"  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Add missing columns to spaces table (icon_color, slug, is_public, max_members).

    These columns were added to Supabase via MCP. This migration ensures they exist
    for fresh installs and makes the migration idempotent.

    NOTE: organization_id is added by 20251106_rename_query_to_thread.py migration,
    not here, to avoid conflicts.
    """
    # Add icon_color column (original migration)
    op.execute("""
        ALTER TABLE spaces
        ADD COLUMN IF NOT EXISTS icon_color VARCHAR(20);
    """)

    # Add slug column (required, unique)
    # Note: For existing spaces without slug, we'll need a data migration
    op.execute("""
        ALTER TABLE spaces
        ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
    """)

    # Create unique index on slug if it doesn't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'spaces'
                AND indexname = 'uq_spaces_slug'
            ) THEN
                CREATE UNIQUE INDEX uq_spaces_slug ON spaces(slug);
            END IF;
        END
        $$;
    """)

    # Create regular index on slug if it doesn't exist (for lookups)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'spaces'
                AND indexname = 'ix_spaces_slug'
            ) THEN
                CREATE INDEX ix_spaces_slug ON spaces(slug);
            END IF;
        END
        $$;
    """)

    # Add is_public column (boolean, default false)
    op.execute("""
        ALTER TABLE spaces
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    """)

    # Add max_members column (integer, nullable)
    op.execute("""
        ALTER TABLE spaces
        ADD COLUMN IF NOT EXISTS max_members INTEGER;
    """)


def downgrade() -> None:
    """Remove added columns from spaces table.

    NOTE: organization_id is not dropped here because it's managed by
    20251106_rename_query_to_thread.py migration downgrade.
    """
    # Drop columns in reverse order
    op.execute("ALTER TABLE spaces DROP COLUMN IF EXISTS max_members;")
    op.execute("ALTER TABLE spaces DROP COLUMN IF EXISTS is_public;")
    op.execute("ALTER TABLE spaces DROP COLUMN IF EXISTS slug;")
    op.execute("ALTER TABLE spaces DROP COLUMN IF EXISTS icon_color;")
