"""rename role to member_role in space_members table

Revision ID: 20251022_rename_role
Revises: 0420e85cda0d
Create Date: 2025-10-22 23:55:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251022_rename_role'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '0420e85cda0d'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Rename role column to member_role and change type to member_role enum."""
    # Rename the column from role to member_role
    op.alter_column('space_members', 'role', new_column_name='member_role')

    # Drop the default value first
    op.execute("ALTER TABLE space_members ALTER COLUMN member_role DROP DEFAULT;")

    # Change the column type from user_role to member_role
    op.execute("""
        ALTER TABLE space_members
        ALTER COLUMN member_role TYPE member_role
        USING CASE
            WHEN member_role::text = 'admin' THEN 'owner'::member_role
            WHEN member_role::text = 'member' THEN 'editor'::member_role
            WHEN member_role::text = 'viewer' THEN 'viewer'::member_role
            ELSE 'viewer'::member_role
        END;
    """)

    # Set the new default value
    op.execute("ALTER TABLE space_members ALTER COLUMN member_role SET DEFAULT 'viewer'::member_role;")


def downgrade() -> None:
    """Rename member_role back to role and change type back to user_role."""
    # Drop the default value first
    op.execute("ALTER TABLE space_members ALTER COLUMN member_role DROP DEFAULT;")

    # Change the column type back from member_role to user_role
    op.execute("""
        ALTER TABLE space_members
        ALTER COLUMN member_role TYPE user_role
        USING CASE
            WHEN member_role::text = 'owner' THEN 'admin'::user_role
            WHEN member_role::text = 'editor' THEN 'member'::user_role
            WHEN member_role::text = 'viewer' THEN 'viewer'::user_role
            ELSE 'member'::user_role
        END;
    """)

    # Set the old default value
    op.execute("ALTER TABLE space_members ALTER COLUMN member_role SET DEFAULT 'member'::user_role;")

    # Rename the column back
    op.alter_column('space_members', 'member_role', new_column_name='role')
