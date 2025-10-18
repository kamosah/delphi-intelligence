"""Add document_chunks table for text chunking

Revision ID: dd3d9f33c4de
Revises: 20251017_000000
Create Date: 2025-10-18 15:52:37.847862

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dd3d9f33c4de'
down_revision: Union[str, Sequence[str], None] = '20251017_000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create document_chunks table
    op.create_table('document_chunks',
    sa.Column('document_id', sa.UUID(), nullable=False),
    sa.Column('chunk_text', sa.Text(), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('token_count', sa.Integer(), nullable=False),
    sa.Column('embedding', sa.String(), nullable=True),
    sa.Column('chunk_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('start_char', sa.BigInteger(), nullable=False),
    sa.Column('end_char', sa.BigInteger(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    with op.batch_alter_table('document_chunks', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_document_chunks_chunk_index'), ['chunk_index'], unique=False)
        batch_op.create_index(batch_op.f('ix_document_chunks_document_id'), ['document_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_document_chunks_id'), ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    with op.batch_alter_table('document_chunks', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_document_chunks_id'))
        batch_op.drop_index(batch_op.f('ix_document_chunks_document_id'))
        batch_op.drop_index(batch_op.f('ix_document_chunks_chunk_index'))

    # Drop table
    op.drop_table('document_chunks')
