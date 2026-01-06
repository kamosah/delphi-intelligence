"""create organization invitations table

Implements organization invitation system for team collaboration.

This migration creates the organization_invitations table to track email-based
invitations to organizations. Uses Supabase's inviteUserByEmail() for sending
invitation emails with built-in templates.

Features:
- Email-based invitations with role specification
- Status tracking (pending, accepted, expired, revoked)
- Expiration support
- Unique constraint on pending invitations per email/org
- Integration with Supabase auth (supabase_user_id)

Related: LOG-218, LOG-245
Revision ID: f4069044a2ec
Revises: 7e3389fa3947
Create Date: 2026-01-06 12:42:43.980004

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4069044a2ec'
down_revision: Union[str, Sequence[str], None] = '7e3389fa3947'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create organization_invitations table and invitation_status ENUM."""

    # Create invitation_status ENUM type
    op.execute("""
        CREATE TYPE invitation_status AS ENUM (
            'pending',
            'accepted',
            'expired',
            'revoked'
        );
    """)

    # Create organization_invitations table
    op.execute("""
        CREATE TABLE organization_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            invitee_email VARCHAR(255) NOT NULL,
            invitee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            invitation_role organization_role NOT NULL DEFAULT 'member',
            status invitation_status NOT NULL DEFAULT 'pending',
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            accepted_at TIMESTAMP WITH TIME ZONE,
            revoked_at TIMESTAMP WITH TIME ZONE,
            supabase_user_id UUID,
            invitation_metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
    """)

    # Create indexes for efficient querying
    op.create_index(
        'idx_org_invitations_organization_id',
        'organization_invitations',
        ['organization_id']
    )
    op.create_index(
        'idx_org_invitations_invitee_email',
        'organization_invitations',
        ['invitee_email']
    )
    op.create_index(
        'idx_org_invitations_status',
        'organization_invitations',
        ['status']
    )

    # Create unique constraint: only one pending invitation per email/org
    # Prevents duplicate invitations to same user for same organization
    op.execute("""
        CREATE UNIQUE INDEX unique_pending_invitation
            ON organization_invitations(organization_id, invitee_email)
            WHERE status = 'pending';
    """)


def downgrade() -> None:
    """Drop organization_invitations table and invitation_status ENUM."""

    # Drop table (indexes cascade automatically)
    op.execute('DROP TABLE IF EXISTS organization_invitations CASCADE;')

    # Drop ENUM type
    op.execute('DROP TYPE IF EXISTS invitation_status;')
