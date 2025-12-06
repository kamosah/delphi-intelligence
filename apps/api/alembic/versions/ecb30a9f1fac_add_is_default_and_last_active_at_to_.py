"""add_is_default_and_last_active_at_to_organization_members

Revision ID: ecb30a9f1fac
Revises: 7dc6d7cc70eb
Create Date: 2025-12-01 01:16:44.033819

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ecb30a9f1fac'
down_revision: Union[str, Sequence[str], None] = '7dc6d7cc70eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add new columns to organization_members
    op.add_column(
        'organization_members',
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'organization_members',
        sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=True)
    )

    # 2. Create index for performance (queries will filter by user_id + is_default)
    op.create_index(
        'idx_org_members_user_default',
        'organization_members',
        ['user_id', 'is_default']
    )

    # 3. Data backfill: Set is_default=true on memberships matching user_preferences.current_organization_id
    op.execute("""
        UPDATE organization_members om
        SET is_default = TRUE,
            last_active_at = NOW()
        FROM user_preferences up
        WHERE om.user_id = up.user_id
        AND om.organization_id = up.current_organization_id
        AND up.current_organization_id IS NOT NULL
    """)

    # 4. For users with no default set, set is_default=true on their first membership (by created_at)
    op.execute("""
        WITH first_memberships AS (
            SELECT DISTINCT ON (user_id) id
            FROM organization_members
            WHERE user_id NOT IN (
                SELECT user_id FROM organization_members WHERE is_default = TRUE
            )
            ORDER BY user_id, created_at ASC
        )
        UPDATE organization_members
        SET is_default = TRUE,
            last_active_at = NOW()
        WHERE id IN (SELECT id FROM first_memberships)
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index
    op.drop_index('idx_org_members_user_default', table_name='organization_members')

    # Drop columns
    op.drop_column('organization_members', 'last_active_at')
    op.drop_column('organization_members', 'is_default')
