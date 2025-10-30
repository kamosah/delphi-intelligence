"""add icon_color field to spaces table

Revision ID: 20251022_add_icon_color
Revises: 20251020_add_confidence_score
Create Date: 2025-10-22 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251022_add_icon_color'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '20251020_add_confidence_score'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Add icon_color column to spaces table."""
    # Add icon_color column to spaces table
    op.add_column(
        'spaces',
        sa.Column('icon_color', sa.String(20), nullable=True)
    )


def downgrade() -> None:
    """Remove icon_color column from spaces table."""
    op.drop_column('spaces', 'icon_color')
