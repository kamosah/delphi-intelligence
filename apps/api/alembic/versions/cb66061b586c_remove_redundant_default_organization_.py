"""remove redundant default_organization_id from users

This migration removes the unused `default_organization_id` field from the users table.

The actual org selection logic uses `OrganizationMember.is_default`, making this field redundant.
This removal also resolves SQLAlchemy relationship ambiguity between users and organizations tables.

Related: LOG-254
Revision ID: cb66061b586c
Revises: a3c105090510
Create Date: 2025-12-29 23:23:59.493275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'cb66061b586c'
down_revision: Union[str, Sequence[str], None] = 'a3c105090510'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove redundant default_organization_id from users table."""
    # Drop the column (foreign key constraint will be dropped automatically)
    op.drop_column('users', 'default_organization_id')


def downgrade() -> None:
    """Restore default_organization_id column (not recommended - field is unused)."""
    # Re-add the column with foreign key
    op.add_column(
        'users',
        sa.Column(
            'default_organization_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('organizations.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
