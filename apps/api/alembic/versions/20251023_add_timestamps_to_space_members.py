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
    """Add created_at and updated_at columns to space_members table."""
    # Add created_at column
    op.execute("""
        ALTER TABLE space_members
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    """)

    # Add updated_at column
    op.execute("""
        ALTER TABLE space_members
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    """)


def downgrade() -> None:
    """Remove created_at and updated_at columns from space_members table."""
    # Drop the timestamp columns
    op.drop_column('space_members', 'updated_at')
    op.drop_column('space_members', 'created_at')
