"""add_zedtoken_columns

Revision ID: 34d2490c6293
Revises: 5c4c7c20e2bc
Create Date: 2025-12-27 21:33:31.748793

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34d2490c6293'
down_revision: Union[str, Sequence[str], None] = '5c4c7c20e2bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add zedtoken column to organizations table
    # This stores the SpiceDB ZedToken after synchronous permission writes
    # Enables read-your-writes consistency for critical operations
    op.add_column(
        'organizations',
        sa.Column('zedtoken', sa.String(255), nullable=True, comment='SpiceDB ZedToken for read-your-writes consistency'),
    )

    # Add zedtoken column to spaces table
    # Same purpose as organizations - stores ZedToken after synchronous permission writes
    op.add_column(
        'spaces',
        sa.Column('zedtoken', sa.String(255), nullable=True, comment='SpiceDB ZedToken for read-your-writes consistency'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove zedtoken columns
    op.drop_column('spaces', 'zedtoken')
    op.drop_column('organizations', 'zedtoken')
