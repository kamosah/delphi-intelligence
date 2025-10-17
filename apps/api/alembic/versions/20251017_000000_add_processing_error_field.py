"""add_processing_error_field

Revision ID: 20251017_000000
Revises: 20251014_220000
Create Date: 2025-10-17 00:00:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251017_000000"
down_revision = "20251014_220000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add processing_error field to documents table."""
    op.add_column("documents", sa.Column("processing_error", sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove processing_error field from documents table."""
    op.drop_column("documents", "processing_error")
