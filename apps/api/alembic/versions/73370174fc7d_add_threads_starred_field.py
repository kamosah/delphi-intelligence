"""add_threads_starred_field

Revision ID: 73370174fc7d
Revises: 858c0653231b
Create Date: 2025-11-22 15:30:27.889962

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73370174fc7d'
down_revision: Union[str, Sequence[str], None] = '858c0653231b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_starred column to threads table
    op.add_column(
        'threads',
        sa.Column('is_starred', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )

    # Add index for efficient filtering of starred threads
    op.create_index(
        'idx_threads_starred',
        'threads',
        ['is_starred'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove index first
    op.drop_index('idx_threads_starred', table_name='threads')

    # Remove is_starred column
    op.drop_column('threads', 'is_starred')
