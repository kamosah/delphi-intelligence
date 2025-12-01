"""drop_current_organization_id_from_user_preferences

Revision ID: 69ebefb5bde9
Revises: ecb30a9f1fac
Create Date: 2025-12-01 01:22:19.061561

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '69ebefb5bde9'
down_revision: Union[str, Sequence[str], None] = 'ecb30a9f1fac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop foreign key constraint
    op.drop_constraint(
        'fk_user_preferences_current_organization',
        'user_preferences',
        type_='foreignkey'
    )

    # Drop index
    op.drop_index(
        'idx_user_preferences_current_organization',
        table_name='user_preferences'
    )

    # Drop column
    op.drop_column('user_preferences', 'current_organization_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add column
    op.add_column(
        'user_preferences',
        sa.Column('current_organization_id', UUID(as_uuid=True), nullable=True)
    )

    # Re-create foreign key
    op.create_foreign_key(
        'fk_user_preferences_current_organization',
        'user_preferences', 'organizations',
        ['current_organization_id'], ['id'],
        ondelete='SET NULL'
    )

    # Re-create index
    op.create_index(
        'idx_user_preferences_current_organization',
        'user_preferences',
        ['current_organization_id']
    )

    # Backfill from organization_members.is_default
    op.execute("""
        UPDATE user_preferences up
        SET current_organization_id = (
            SELECT om.organization_id
            FROM organization_members om
            WHERE om.user_id = up.user_id
            AND om.is_default = TRUE
            LIMIT 1
        )
    """)
