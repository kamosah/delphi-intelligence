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
    """Align existing document schema with the new code model."""

    # Rename columns to match new model
    op.alter_column("documents", "file_name", new_column_name="name")
    op.alter_column("documents", "file_size", new_column_name="size_bytes")
    op.alter_column("documents", "mime_type", new_column_name="file_type")
    op.alter_column("documents", "storage_path", new_column_name="file_path")

    # Add new columns that don't exist yet
    op.add_column("documents", sa.Column("status", sa.String(length=20), nullable=False, server_default="uploaded"))
    op.add_column("documents", sa.Column("extracted_text", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("doc_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("documents", sa.Column("processed_at", sa.DateTime(), nullable=True))

    # Create index on status for filtering
    op.create_index("ix_documents_status", "documents", ["status"], unique=False)

    # Drop columns that are no longer needed
    op.drop_column("documents", "title")
    op.drop_column("documents", "description")
    op.drop_column("documents", "document_type")
    op.drop_column("documents", "url")
    op.drop_column("documents", "content_preview")
    op.drop_column("documents", "is_processed")
    op.drop_column("documents", "content_vector")

    # Make nullable columns non-nullable with defaults where appropriate
    op.alter_column("documents", "name", nullable=False, server_default="Untitled")
    op.alter_column("documents", "file_type", nullable=False, server_default="application/octet-stream")
    op.alter_column("documents", "file_path", nullable=False, server_default="")
    op.alter_column("documents", "size_bytes", nullable=False, server_default="0")
    op.alter_column("documents", "uploaded_by", nullable=False)


def downgrade() -> None:
    """Revert to previous schema."""

    # Rename columns back
    op.alter_column("documents", "name", new_column_name="file_name")
    op.alter_column("documents", "size_bytes", new_column_name="file_size")
    op.alter_column("documents", "file_type", new_column_name="mime_type")
    op.alter_column("documents", "file_path", new_column_name="storage_path")

    # Drop new columns
    op.drop_index("ix_documents_status", table_name="documents")
    op.drop_column("documents", "processed_at")
    op.drop_column("documents", "doc_metadata")
    op.drop_column("documents", "extracted_text")
    op.drop_column("documents", "status")

    # Add back old columns
    op.add_column("documents", sa.Column("title", sa.String(length=200), nullable=False, server_default="Untitled"))
    op.add_column("documents", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("url", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("content_preview", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("is_processed", sa.Boolean(), nullable=True))
    op.add_column("documents", sa.Column("content_vector", postgresql.TSVECTOR(), nullable=True))

    # Recreate document_type enum and column
    document_type_enum = postgresql.ENUM('text', 'pdf', 'image', 'url', 'code', name='document_type')
    document_type_enum.create(op.get_bind())
    op.add_column("documents", sa.Column("document_type", document_type_enum, nullable=False, server_default="text"))

    # Revert nullable changes
    op.alter_column("documents", "file_name", nullable=True)
    op.alter_column("documents", "mime_type", nullable=True)
    op.alter_column("documents", "storage_path", nullable=True)
    op.alter_column("documents", "file_size", nullable=True)
    op.alter_column("documents", "uploaded_by", nullable=True)
