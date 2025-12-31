"""add_thread_created_at_index

Revision ID: d94e0dd20da6
Revises: 19f86983628b
Create Date: 2025-12-31 02:41:59.787626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd94e0dd20da6'
down_revision: Union[str, Sequence[str], None] = '19f86983628b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add index on threads.created_at for ORDER BY performance.

    Thread listing queries use ORDER BY created_at DESC, but this column
    was not indexed. This index improves query performance for:
    - Space thread listings (apps/api/app/graphql/query.py:636)
    - Org thread listings (apps/api/app/graphql/query.py:668)
    - Personal thread listings (apps/api/app/graphql/query.py:693)

    Addresses PR feedback: Performance optimization for thread queries.
    """
    # Add index on threads.created_at for ORDER BY queries
    op.create_index(
        'idx_threads_created_at',
        'threads',
        ['created_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove threads.created_at index."""
    op.drop_index('idx_threads_created_at', table_name='threads')
