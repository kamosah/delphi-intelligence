"""add_messages_table_for_multi_turn_conversations

This migration creates the messages table to support multi-turn conversations
within threads, enabling ChatGPT-style follow-up questions (LOG-207).

Current model: Thread stores single query + result
New model: Thread contains multiple messages (user/assistant/system)

Metadata structure in JSONB:
{
    "citations": [...],
    "confidence_score": 0.85,
    "model_used": "gpt-4-turbo",
    "tokens_used": 1500,
    "processing_time_ms": 2500
}

Revision ID: 3a65059eb513
Revises: 20251106_add_org_members
Create Date: 2025-11-15 15:50:34.994069

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3a65059eb513'
down_revision: Union[str, Sequence[str], None] = '20251106_add_org_members'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create messages table for multi-turn conversations."""

    # Create message_role enum type (with checkfirst to avoid duplicate error)
    message_role_enum = postgresql.ENUM('user', 'assistant', 'system', name='message_role', create_type=False)
    message_role_enum.create(op.get_bind(), checkfirst=True)

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('threads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_role', message_role_enum, nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes for performance
    op.create_index(
        'idx_messages_thread_id',
        'messages',
        ['thread_id']
    )

    op.create_index(
        'idx_messages_created_at',
        'messages',
        ['thread_id', 'created_at']
    )


def downgrade() -> None:
    """Drop messages table."""
    # Drop indexes first
    op.drop_index('idx_messages_created_at', table_name='messages')
    op.drop_index('idx_messages_thread_id', table_name='messages')

    # Drop table (CASCADE constraint will be dropped automatically)
    op.drop_table('messages')

    # Drop message_role enum type
    message_role_enum = postgresql.ENUM('user', 'assistant', 'system', name='message_role')
    message_role_enum.drop(op.get_bind())
