"""create_auth_sync_outbox_table

Revision ID: 5c4c7c20e2bc
Revises: c9a201a09367
Create Date: 2025-12-27 21:32:39.424651

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


# revision identifiers, used by Alembic.
revision: str = '5c4c7c20e2bc'
down_revision: Union[str, Sequence[str], None] = 'c9a201a09367'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum types for event_type and status
    event_type_enum = sa.Enum(
        'organization_created',
        'organization_deleted',
        'organization_member_added',
        'organization_member_removed',
        'organization_member_role_changed',
        'space_created',
        'space_deleted',
        'space_member_added',
        'space_member_removed',
        'document_created',
        'document_deleted',
        'invitation_created',
        'invitation_accepted',
        'invitation_revoked',
        name='auth_sync_event_type',
        create_type=True,
    )

    status_enum = sa.Enum(
        'pending',
        'processing',
        'completed',
        'failed',
        'dead_letter',
        name='auth_sync_status',
        create_type=True,
    )

    # Create auth_sync_outbox table
    op.create_table(
        'auth_sync_outbox',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_type', event_type_enum, nullable=False),
        sa.Column('table_name', sa.String(100), nullable=False),
        sa.Column('record_id', UUID(as_uuid=True), nullable=False),
        sa.Column('event_data', JSONB, nullable=False),
        sa.Column('status', status_enum, nullable=False, server_default='pending'),
        sa.Column('retry_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('max_retries', sa.Integer, nullable=False, server_default='5'),
        sa.Column('last_error', sa.Text, nullable=True),
        sa.Column('next_retry_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('processed_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )

    # Create indexes for efficient querying
    op.create_index('idx_auth_sync_outbox_status', 'auth_sync_outbox', ['status'])
    op.create_index('idx_auth_sync_outbox_next_retry_at', 'auth_sync_outbox', ['next_retry_at'])
    op.create_index('idx_auth_sync_outbox_created_at', 'auth_sync_outbox', ['created_at'])
    op.create_index(
        'idx_auth_sync_outbox_pending_retry',
        'auth_sync_outbox',
        ['status', 'next_retry_at'],
        postgresql_where=sa.text("status IN ('pending', 'failed')"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('idx_auth_sync_outbox_pending_retry', 'auth_sync_outbox')
    op.drop_index('idx_auth_sync_outbox_created_at', 'auth_sync_outbox')
    op.drop_index('idx_auth_sync_outbox_next_retry_at', 'auth_sync_outbox')
    op.drop_index('idx_auth_sync_outbox_status', 'auth_sync_outbox')

    # Drop table
    op.drop_table('auth_sync_outbox')

    # Drop enum types
    sa.Enum(name='auth_sync_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='auth_sync_event_type').drop(op.get_bind(), checkfirst=True)
