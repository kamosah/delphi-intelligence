"""remove_space_members_joined_at

Remove legacy joined_at column from space_members table.
We use created_at instead (inherited from Base model).

This is part of LOG-160 Task 1: Clean up schema differences.

Revision ID: 20251025_remove_joined_at
Revises: 20251025_align_schemas
Create Date: 2025-10-25 00:00:00

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '20251025_remove_joined_at'
down_revision: Union[str, Sequence[str], None] = '20251025_align_schemas'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove legacy joined_at column from space_members."""
    op.execute("""
        ALTER TABLE space_members DROP COLUMN IF EXISTS joined_at;
    """)

    print("✅ Removed legacy joined_at column from space_members")
    print("   Models now use created_at consistently")


def downgrade() -> None:
    """Restore joined_at column if needed (not recommended)."""
    op.execute("""
        ALTER TABLE space_members
        ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();
    """)

    print("⏮️ Restored joined_at column to space_members")
