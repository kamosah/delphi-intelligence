"""Add user preferences table

Revision ID: 20251007_204756
Revises: 
Create Date: 2025-10-07 20:47:56.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20251007_204756"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add user preferences table."""
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("theme", sa.String(length=20), nullable=True),
        sa.Column("language", sa.String(length=10), nullable=True),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Drop user preferences table."""
    op.drop_table("user_preferences")
