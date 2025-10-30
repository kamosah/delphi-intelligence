"""enable_pgvector_and_add_vector_index

Revision ID: 1b456c54a397
Revises: dd3d9f33c4de
Create Date: 2025-10-19 13:08:05.910996

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b456c54a397'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = 'dd3d9f33c4de'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector;')

    # Alter embedding column to use vector type (1536 dimensions for text-embedding-3-small)
    # The embedding column was created as String, now converting to proper vector type
    op.execute('''
        ALTER TABLE document_chunks
        ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;
    ''')

    # Create IVFFlat index for fast similarity search using cosine distance
    # Lists parameter: sqrt(row_count) is a good starting point
    # For 10k chunks: sqrt(10000) = 100
    # IVFFlat is faster than HNSW for build time, slightly less accurate but acceptable for MVP
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_cosine
        ON document_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    ''')


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the vector index
    op.execute('DROP INDEX IF EXISTS idx_document_chunks_embedding_cosine;')

    # Change embedding column back to string
    # Note: This will lose vector data, only use for development rollback
    op.execute('''
        ALTER TABLE document_chunks
        ALTER COLUMN embedding TYPE varchar USING embedding::text;
    ''')

    # Note: We don't drop the vector extension as other tables might be using it
    # If you need to drop it completely: op.execute('DROP EXTENSION IF EXISTS vector;')
