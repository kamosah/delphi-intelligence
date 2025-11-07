"""add organization_members table for hybrid ownership (LOG-201)

Revision ID: 20251106_add_org_members
Revises: 20251106_rename_query
Create Date: 2025-11-06 11:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '20251106_add_org_members'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '20251106_rename_query'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Add organization_members table for hybrid ownership pattern.

    This implements the industry-standard hybrid ownership approach where:
    - Organization has owner_id (fast lookup for billing, deletion)
    - Organization also has members table with roles (flexible RBAC)
    - Owner should exist in both places (kept in sync)
    """

    # Create organization_members table
    # The organization_role enum will be created automatically by SQLAlchemy (create_type=True)
    # This ensures the enum is properly tracked by Alembic for future migrations
    op.create_table(
        'organization_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('organization_role', sa.Enum('owner', 'admin', 'member', 'viewer', name='organization_role', create_type=True), nullable=False, server_default='member'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('organization_id', 'user_id', name='unique_organization_user'),
    )

    # Create indexes for organization_members
    op.create_index('idx_organization_members_organization_id', 'organization_members', ['organization_id'])
    op.create_index('idx_organization_members_user_id', 'organization_members', ['user_id'])

    # Backfill: Add all organization owners to organization_members with owner role
    # This maintains the hybrid ownership pattern (owner_id + membership)
    op.execute("""
        INSERT INTO organization_members (organization_id, user_id, organization_role)
        SELECT
            o.id,
            o.owner_id,
            'owner'::organization_role
        FROM organizations o
        WHERE o.owner_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Remove organization_members table and organization_role enum."""

    # Drop indexes
    op.drop_index('idx_organization_members_organization_id', table_name='organization_members')
    op.drop_index('idx_organization_members_user_id', table_name='organization_members')

    # Drop table (this will also drop the enum automatically due to CASCADE)
    op.drop_table('organization_members')

    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS organization_role;")
