"""add defensive RLS for space org threads

Adds database-level protection for space/org threads as defense-in-depth.
Primary authorization still via SpiceDB, but RLS prevents unauthorized
database-level access (e.g., direct queries through Supabase dashboard).

This policy complements the existing personal thread RLS policies (19f86983628b)
by ensuring all thread types have database-level protection.

Related: LOG-262 (Critical Items)
Revision ID: 83e918a0b0ba
Revises: 4c8eeb31dbfe
Create Date: 2026-01-05 03:06:51.165626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83e918a0b0ba'
down_revision: Union[str, Sequence[str], None] = '4c8eeb31dbfe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add defense-in-depth RLS policy for space/org threads.

    This policy ensures space/org threads can only be accessed via the service role
    after SpiceDB authorization at the application layer. Direct user access via
    database queries (e.g., Supabase dashboard) is blocked.

    Architecture:
    - Personal threads: RLS enforces owner-only access (migration 19f86983628b)
    - Space/org threads: This RLS blocks direct access + SpiceDB handles permissions
    """

    # Policy: Block direct user access to space/org threads
    # Only service role (backend after SpiceDB check) can access
    op.execute("""
        CREATE POLICY "Space and org threads require app authorization" ON threads
            FOR ALL
            USING (
                visibility IN ('space', 'organization')
                AND auth.role() = 'service_role'
            )
            WITH CHECK (
                visibility IN ('space', 'organization')
                AND auth.role() = 'service_role'
            );
    """)

    # Add explanatory comment to the policy
    op.execute("""
        COMMENT ON POLICY "Space and org threads require app authorization" ON threads IS
        'Defense-in-depth: Blocks direct database access to space/org threads.
         Application layer must use service role after SpiceDB authorization.
         Personal threads use separate RLS policies (migration 19f86983628b).';
    """)


def downgrade() -> None:
    """Remove defense-in-depth RLS policy for space/org threads."""

    op.execute('DROP POLICY IF EXISTS "Space and org threads require app authorization" ON threads;')
