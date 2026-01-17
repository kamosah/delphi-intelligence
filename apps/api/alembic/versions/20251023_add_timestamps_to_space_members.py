"""add created_at and updated_at to space_members table

Revision ID: 20251023_add_timestamps
Revises: 20251022_rename_role
Create Date: 2025-10-23 02:10:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251023_add_timestamps'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '20251022_rename_role'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Conditionally add created_at and updated_at columns to space_members table.

    Checks if columns exist before adding to handle both:
    - Fresh installs (columns exist from initial schema 3df48089188e)
    - Manual DB modifications (columns may not exist)
    """
    # Check and add created_at if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'space_members' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE space_members
                ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)

    # Check and add updated_at if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'space_members' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE space_members
                ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Conditionally remove created_at and updated_at columns from space_members table."""
    # Drop updated_at if exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'space_members' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE space_members DROP COLUMN updated_at;
            END IF;
        END $$;
    """)

    # Drop created_at if exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'space_members' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE space_members DROP COLUMN created_at;
            END IF;
        END $$;
    """)
