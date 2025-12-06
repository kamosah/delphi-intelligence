"""drop_current_organization_id_from_user_preferences

Revision ID: 69ebefb5bde9
Revises: ecb30a9f1fac
Create Date: 2025-12-01 01:22:19.061561

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '69ebefb5bde9'
down_revision: Union[str, Sequence[str], None] = 'ecb30a9f1fac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Get database connection for inspection
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check and drop foreign key constraint if it exists
    foreign_keys = inspector.get_foreign_keys('user_preferences')
    fk_to_drop = None

    # Look for FK constraint pointing to organizations.id from current_organization_id
    for fk in foreign_keys:
        if (fk.get('referred_table') == 'organizations' and
            'current_organization_id' in fk.get('constrained_columns', [])):
            fk_to_drop = fk['name']
            break

    if fk_to_drop:
        op.drop_constraint(fk_to_drop, 'user_preferences', type_='foreignkey')

    # Check and drop index if it exists
    indexes = inspector.get_indexes('user_preferences')
    index_to_drop = None

    # Look for index on current_organization_id column
    for idx in indexes:
        if 'current_organization_id' in idx.get('column_names', []):
            index_to_drop = idx['name']
            break

    if index_to_drop:
        op.drop_index(index_to_drop, table_name='user_preferences')

    # Drop column (this will cascade drop any remaining constraints)
    op.drop_column('user_preferences', 'current_organization_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Get database connection for inspection
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if column already exists
    columns = [col['name'] for col in inspector.get_columns('user_preferences')]

    if 'current_organization_id' not in columns:
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
