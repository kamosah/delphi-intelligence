"""add author_type index to messages table

Revision ID: 4c8eeb31dbfe
Revises: d94e0dd20da6
Create Date: 2026-01-05 03:04:20.477658

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c8eeb31dbfe'
down_revision: Union[str, Sequence[str], None] = 'd94e0dd20da6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add index on messages.author_type for filtering performance.

    Message filtering queries use WHERE author_type = 'agent'|'user'|'system',
    but this column was not indexed. This index improves query performance for:
    - Filtering agent messages for AI response tracking
    - Filtering user messages for conversation analysis
    - Filtering system messages for audit logs

    Related: LOG-262 (Critical Items)
    """
    # Add index on messages.author_type for WHERE clause filtering
    op.create_index(
        'idx_messages_author_type',
        'messages',
        ['author_type'],
        unique=False
    )


def downgrade() -> None:
    """Remove messages.author_type index."""
    op.drop_index('idx_messages_author_type', table_name='messages')
