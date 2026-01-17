"""align_document_model_with_code

Revision ID: 20251014_220000
Revises: 20251007_204756
Create Date: 2025-10-14 22:00:00

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251014_220000"
down_revision = "20251007_204756"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Transform documents table from collaborative editor schema to file-based schema.

    Initial schema (3df48089188e) has: title, content, yjs_state, created_by
    Target schema needs: name, file_type, file_path, size_bytes, status, uploaded_by
    """

    # Step 1: Rename existing columns to match new model
    op.alter_column("documents", "title", new_column_name="name")
    op.alter_column("documents", "created_by", new_column_name="uploaded_by")

    # Step 2: Add new file-related columns with defaults for existing rows
    op.add_column("documents", sa.Column("file_type", sa.String(length=100), nullable=False, server_default="application/octet-stream"))
    op.add_column("documents", sa.Column("file_path", sa.String(length=500), nullable=False, server_default=""))
    op.add_column("documents", sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"))

    # Step 3: Add new processing-related columns
    op.add_column("documents", sa.Column("status", sa.String(length=20), nullable=False, server_default="uploaded"))
    op.add_column("documents", sa.Column("extracted_text", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("doc_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("documents", sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))

    # Step 4: Create index on status for filtering
    op.create_index("ix_documents_status", "documents", ["status"], unique=False)

    # Step 5: Drop columns from old collaborative editor schema
    op.drop_column("documents", "yjs_state")

    # Step 6: Update uploaded_by index to match new column name
    op.drop_index("ix_documents_created_by", table_name="documents")
    op.create_index("ix_documents_uploaded_by", "documents", ["uploaded_by"], unique=False)


def downgrade() -> None:
    """Revert to collaborative editor schema (initial state from 3df48089188e)."""

    # Step 1: Restore uploaded_by index name
    op.drop_index("ix_documents_uploaded_by", table_name="documents")
    op.create_index("ix_documents_created_by", "documents", ["uploaded_by"], unique=False)

    # Step 2: Add back yjs_state column for collaborative editing
    op.add_column("documents", sa.Column("yjs_state", sa.LargeBinary(), nullable=True))

    # Step 3: Drop status index
    op.drop_index("ix_documents_status", table_name="documents")

    # Step 4: Drop file-based and processing columns
    op.drop_column("documents", "processed_at")
    op.drop_column("documents", "doc_metadata")
    op.drop_column("documents", "extracted_text")
    op.drop_column("documents", "status")
    op.drop_column("documents", "size_bytes")
    op.drop_column("documents", "file_path")
    op.drop_column("documents", "file_type")

    # Step 5: Rename columns back to original names
    op.alter_column("documents", "uploaded_by", new_column_name="created_by")
    op.alter_column("documents", "name", new_column_name="title")
