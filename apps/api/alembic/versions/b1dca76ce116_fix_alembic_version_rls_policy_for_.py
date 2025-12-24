"""fix_alembic_version_rls_policy_for_direct_db_connections

Revision ID: b1dca76ce116
Revises: fa470fe3da32
Create Date: 2025-12-24 19:30:12.710684

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1dca76ce116'
down_revision: Union[str, Sequence[str], None] = 'fa470fe3da32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix alembic_version RLS policy to allow direct database connections.

    The previous policy required auth.role() = 'service_role', which only works
    for Supabase Auth connections. Alembic connects via the database pooler
    without a Supabase JWT token, so auth.uid() IS NULL.

    This hotfix allows both:
    1. Supabase service role (auth.role() = 'service_role')
    2. Direct database connections (auth.uid() IS NULL) - used by Alembic
    """

    # Drop the old restrictive policy
    op.execute("DROP POLICY IF EXISTS alembic_version_service_write ON alembic_version")

    # Create new policy that allows direct database connections (no JWT)
    op.execute("""
        CREATE POLICY alembic_version_service_write ON alembic_version
        FOR ALL
        USING (
            auth.role() = 'service_role' OR
            auth.uid() IS NULL
        )
        WITH CHECK (
            auth.role() = 'service_role' OR
            auth.uid() IS NULL
        )
    """)


def downgrade() -> None:
    """Revert to the original restrictive policy (not recommended)."""

    # Drop the permissive policy
    op.execute("DROP POLICY IF EXISTS alembic_version_service_write ON alembic_version")

    # Restore original restrictive policy (will block Alembic again)
    op.execute("""
        CREATE POLICY alembic_version_service_write ON alembic_version
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    """)
