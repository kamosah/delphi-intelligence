"""create organization invitations table

Revision ID: 1977067ddcc0
Revises: 7047b3e0871b
Create Date: 2026-01-17 18:07:15.929800

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1977067ddcc0'
down_revision: Union[str, Sequence[str], None] = '7047b3e0871b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create organization_invitations table with security features."""
    # 1. Reference existing enum type
    organization_role_enum = postgresql.ENUM('owner', 'admin', 'member', 'viewer', name='organization_role', create_type=False)

    # 2. Create table
    op.create_table(
        'organization_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),

        # Invitee information
        sa.Column('invitee_email', sa.String(255), nullable=False),
        sa.Column('invitation_role', organization_role_enum, nullable=False, server_default='member'),

        # Lifecycle tracking
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('invited_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('invited_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('accepted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('revoked_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),

        # Metadata
        sa.Column('custom_message', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 2. Create unique partial index for pending invitations
    op.execute("""
        CREATE UNIQUE INDEX idx_org_invitations_unique_pending
        ON organization_invitations (organization_id, invitee_email)
        WHERE status = 'pending'
    """)

    # 3. Create performance indexes
    op.create_index('idx_org_invitations_organization_id', 'organization_invitations', ['organization_id'])
    op.create_index('idx_org_invitations_invitee_email', 'organization_invitations', ['invitee_email'])
    op.create_index('idx_org_invitations_status', 'organization_invitations', ['status'])

    # 4. Create partial index for pending expiration checks
    op.execute("""
        CREATE INDEX idx_org_invitations_expires
        ON organization_invitations (expires_at)
        WHERE status = 'pending'
    """)

    # 5. Create composite index for common queries
    op.create_index(
        'idx_org_invitations_email_status_expires',
        'organization_invitations',
        ['invitee_email', 'status', 'expires_at']
    )

    # 6. Enable RLS for defense-in-depth security
    op.execute("ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY")

    # 7. RLS Policy: Admins can manage invitations
    op.execute("""
        CREATE POLICY "Admins manage invitations"
        ON organization_invitations FOR ALL
        USING (
            organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND organization_role IN ('admin', 'owner')
            )
        )
    """)

    # 8. RLS Policy: Users can view their own invitations
    op.execute("""
        CREATE POLICY "Users view their invitations"
        ON organization_invitations FOR SELECT
        USING (invitee_email = (SELECT email FROM users WHERE id = auth.uid()))
    """)


def downgrade() -> None:
    """Drop organization_invitations table and related objects."""
    # Drop RLS policies
    op.execute('DROP POLICY IF EXISTS "Users view their invitations" ON organization_invitations')
    op.execute('DROP POLICY IF EXISTS "Admins manage invitations" ON organization_invitations')

    # Drop indexes
    op.drop_index('idx_org_invitations_email_status_expires', table_name='organization_invitations')
    op.execute('DROP INDEX IF EXISTS idx_org_invitations_expires')
    op.drop_index('idx_org_invitations_status', table_name='organization_invitations')
    op.drop_index('idx_org_invitations_invitee_email', table_name='organization_invitations')
    op.drop_index('idx_org_invitations_organization_id', table_name='organization_invitations')
    op.execute('DROP INDEX IF EXISTS idx_org_invitations_unique_pending')

    # Drop table
    op.drop_table('organization_invitations')
