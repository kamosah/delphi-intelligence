"""align_queries_table_with_model

Revision ID: 5b44e667b3ee
Revises: 20251023_add_timestamps
Create Date: 2025-10-23 17:40:18.927682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b44e667b3ee'
down_revision: Union[str, Sequence[str], None] = '20251023_add_timestamps'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Align queries table columns with SQLAlchemy model naming conventions."""
    # Rename columns to match model (better naming)
    op.execute('ALTER TABLE queries RENAME COLUMN question TO query_text;')
    op.execute('ALTER TABLE queries RENAME COLUMN answer TO result;')
    op.execute('ALTER TABLE queries RENAME COLUMN user_id TO created_by;')

    # Add agent_steps column for LangGraph debugging
    op.execute('ALTER TABLE queries ADD COLUMN agent_steps JSONB;')

    # Keep context, title, and other Supabase columns for RAG pipeline


def downgrade() -> None:
    """Revert queries table to original Supabase schema."""
    # Rename columns back
    op.execute('ALTER TABLE queries RENAME COLUMN query_text TO question;')
    op.execute('ALTER TABLE queries RENAME COLUMN result TO answer;')
    op.execute('ALTER TABLE queries RENAME COLUMN created_by TO user_id;')

    # Drop agent_steps
    op.execute('ALTER TABLE queries DROP COLUMN IF EXISTS agent_steps;')
