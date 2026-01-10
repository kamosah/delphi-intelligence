"""add_timestamps_to_query_documents

Revision ID: 1f375c83b052
Revises: 4a41cb0ab966
Create Date: 2025-10-30 00:37:42.478038

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f375c83b052'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '4a41cb0ab966'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Conditionally add created_at and updated_at columns to query_documents table.

    Migration 20251025_align_schemas creates query_documents table with these columns,
    so we only add them if they don't already exist.
    """
    # Conditionally add created_at if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'query_documents' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE query_documents
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)

    # Conditionally add updated_at if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'query_documents' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE query_documents
                ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Conditionally remove created_at and updated_at columns from query_documents table."""
    # Conditionally drop updated_at if exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'query_documents' AND column_name = 'updated_at'
            ) THEN
                ALTER TABLE query_documents DROP COLUMN updated_at;
            END IF;
        END $$;
    """)

    # Conditionally drop created_at if exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'query_documents' AND column_name = 'created_at'
            ) THEN
                ALTER TABLE query_documents DROP COLUMN created_at;
            END IF;
        END $$;
    """)
