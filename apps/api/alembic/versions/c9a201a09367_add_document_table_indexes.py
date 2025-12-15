"""add_document_table_indexes

Revision ID: c9a201a09367
Revises: 69ebefb5bde9
Create Date: 2025-12-15 21:27:48.309103

"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c9a201a09367"
down_revision: str | Sequence[str] | None = "69ebefb5bde9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pg_trgm extension for fast ILIKE searches
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # GIN index for name search (fast ILIKE)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_documents_name_trgm ON documents "
        "USING gin (name gin_trgm_ops)"
    )

    # Index for file_type filtering
    op.create_index("idx_documents_file_type", "documents", ["file_type"], unique=False)

    # Composite index for space + status (common filter combo)
    op.create_index("idx_documents_space_status", "documents", ["space_id", "status"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_documents_space_status", table_name="documents")
    op.drop_index("idx_documents_file_type", table_name="documents")
    op.execute("DROP INDEX IF EXISTS idx_documents_name_trgm")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
