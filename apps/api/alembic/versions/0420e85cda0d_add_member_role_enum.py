"""add_member_role_enum

Revision ID: 0420e85cda0d
Revises: 20251022_add_icon_color
Create Date: 2025-10-22 23:24:51.268973

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0420e85cda0d'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '20251022_add_icon_color'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Create MemberRole enum type for space_members table."""
    # Create the enum type (with existence check to prevent conflicts)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
                CREATE TYPE member_role AS ENUM ('owner', 'editor', 'viewer');
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    """Drop MemberRole enum type."""
    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS member_role;")
