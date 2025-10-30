"""add_timestamps_to_query_documents

Revision ID: 1f375c83b052
Revises: 4a41cb0ab966
Create Date: 2025-10-30 00:37:42.478038

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f375c83b052'
down_revision: Union[str, Sequence[str], None] = '4a41cb0ab966'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add created_at and updated_at columns to query_documents table."""
    # Add created_at column with default to NOW()
    op.execute("""
        ALTER TABLE query_documents
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    """)

    # Add updated_at column with default to NOW()
    op.execute("""
        ALTER TABLE query_documents
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    """)


def downgrade() -> None:
    """Remove created_at and updated_at columns from query_documents table."""
    op.execute("""
        ALTER TABLE query_documents
        DROP COLUMN created_at,
        DROP COLUMN updated_at
    """)
