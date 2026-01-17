"""make_document_content_nullable

Revision ID: bdc1b6722798
Revises: 7e3389fa3947
Create Date: 2026-01-14 13:23:52.352441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bdc1b6722798'
down_revision: Union[str, Sequence[str], None] = ('a95d41dc7f4f', '7e3389fa3947')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make document.content nullable to match model definition.

    Documents can be uploaded without content initially, and content
    is populated during processing. This aligns the database schema
    with the SQLAlchemy model which has content as nullable=True.
    """
    op.alter_column("documents", "content", nullable=True)


def downgrade() -> None:
    """Revert content column to NOT NULL (requires data migration)."""
    # Note: This downgrade will fail if any documents have NULL content.
    # In practice, you'd need to populate NULL values before downgrading.
    op.alter_column("documents", "content", nullable=False)
