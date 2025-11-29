"""add current_organization_id to user_preferences

Revision ID: 7dc6d7cc70eb
Revises: 73370174fc7d
Create Date: 2025-11-28 20:08:11.904766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '7dc6d7cc70eb'
down_revision: Union[str, Sequence[str], None] = '73370174fc7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add nullable column
    op.add_column(
        'user_preferences',
        sa.Column('current_organization_id', UUID(as_uuid=True), nullable=True)
    )

    # 2. Add foreign key constraint with SET NULL on delete
    op.create_foreign_key(
        'fk_user_preferences_current_organization',
        'user_preferences', 'organizations',
        ['current_organization_id'], ['id'],
        ondelete='SET NULL'
    )

    # 3. Add index for performance
    op.create_index(
        'idx_user_preferences_current_organization',
        'user_preferences',
        ['current_organization_id']
    )

    # 4. Data migration: Set current_organization_id to user's first org
    op.execute("""
        UPDATE user_preferences up
        SET current_organization_id = (
            SELECT om.organization_id
            FROM organization_members om
            WHERE om.user_id = up.user_id
            ORDER BY om.created_at ASC
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = up.user_id
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_user_preferences_current_organization', table_name='user_preferences')
    op.drop_constraint('fk_user_preferences_current_organization', 'user_preferences', type_='foreignkey')
    op.drop_column('user_preferences', 'current_organization_id')
