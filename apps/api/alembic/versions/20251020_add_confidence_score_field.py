"""add confidence_score field to queries table

Revision ID: 20251020_add_confidence_score
Revises: 1b456c54a397
Create Date: 2025-10-20 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251020_add_confidence_score'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '1b456c54a397'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Add confidence_score column to queries table."""
    # Add confidence_score column to queries table
    op.add_column(
        'queries',
        sa.Column('confidence_score', sa.Float(), nullable=True)
    )


def downgrade() -> None:
    """Remove confidence_score column from queries table."""
    op.drop_column('queries', 'confidence_score')
