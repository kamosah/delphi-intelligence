"""make_document_processed_at_timezone_aware

Revision ID: 4a41cb0ab966
Revises: 20251025_add_user_prefs
Create Date: 2025-10-30 00:26:16.243395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a41cb0ab966'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '20251025_add_user_prefs'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Make documents.processed_at timezone-aware."""
    # Change processed_at from TIMESTAMP to TIMESTAMP WITH TIME ZONE
    # Existing NULL values remain NULL, existing timestamps are interpreted as UTC
    op.execute("""
        ALTER TABLE documents
        ALTER COLUMN processed_at TYPE TIMESTAMP WITH TIME ZONE
        USING processed_at AT TIME ZONE 'UTC'
    """)


def downgrade() -> None:
    """Remove timezone from documents.processed_at."""
    # Change back to TIMESTAMP WITHOUT TIME ZONE
    op.execute("""
        ALTER TABLE documents
        ALTER COLUMN processed_at TYPE TIMESTAMP WITHOUT TIME ZONE
    """)
