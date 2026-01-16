"""fix restrictive rls policy to allow personal threads

Fixes critical bug in RESTRICTIVE RLS policy (migration 7e3389fa3947) that blocks
personal threads from being read by their owners.

Root Cause:
- RESTRICTIVE policies use AND logic with all other policies
- Current policy: USING (visibility IN ('space', 'organization') AND auth.role() = 'service_role')
- For personal threads: (visibility IN (...) = FALSE) → entire policy evaluates to FALSE
- Result: (PERMISSIVE personal policy: TRUE) AND (RESTRICTIVE policy: FALSE) = FALSE

Fix:
- Update RESTRICTIVE policy to only restrict space/org threads
- Allow personal threads to pass through by checking visibility first
- New logic: USING (visibility NOT IN ('space', 'organization') OR auth.role() = 'service_role')

Security Impact:
- Personal threads: No longer blocked by RESTRICTIVE policy
- Space/org threads: Still require service_role (defense-in-depth maintained)

Related: RLS test failures in test_rls_policies.py
Revision ID: 7047b3e0871b
Revises: bdc1b6722798
Create Date: 2026-01-15 18:58:49.378003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7047b3e0871b'
down_revision: Union[str, Sequence[str], None] = 'bdc1b6722798'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix RESTRICTIVE RLS policy to allow personal threads."""

    # Drop the broken restrictive policy
    op.execute('DROP POLICY IF EXISTS "Space and org threads require app authorization" ON threads;')

    # Create fixed RESTRICTIVE policy that only restricts space/org threads
    # Personal threads are allowed through (visibility NOT IN check passes)
    op.execute("""
        CREATE POLICY "Space and org threads require app authorization" ON threads
            AS RESTRICTIVE  -- Uses AND logic with other policies
            FOR ALL
            USING (
                visibility NOT IN ('space', 'organization')  -- Allow personal threads
                OR auth.role() = 'service_role'             -- Require service_role for space/org
            )
            WITH CHECK (
                visibility NOT IN ('space', 'organization')  -- Allow personal threads
                OR auth.role() = 'service_role'             -- Require service_role for space/org
            );
    """)

    # Update comment to reflect the fix
    op.execute("""
        COMMENT ON POLICY "Space and org threads require app authorization" ON threads IS
        'Defense-in-depth (RESTRICTIVE): Blocks direct database access to space/org threads.
         Application layer must use service role after SpiceDB authorization.
         RESTRICTIVE mode ensures this requirement is enforced with AND logic.
         Personal threads are explicitly allowed (visibility NOT IN check) to avoid blocking
         them with the restrictive policy.
         Personal threads use separate permissive RLS policies (migration 19f86983628b).';
    """)


def downgrade() -> None:
    """Revert to broken restrictive policy (NOT RECOMMENDED - breaks personal threads)."""

    # Drop the fixed policy
    op.execute('DROP POLICY IF EXISTS "Space and org threads require app authorization" ON threads;')

    # Recreate the broken policy (for rollback compatibility only)
    op.execute("""
        CREATE POLICY "Space and org threads require app authorization" ON threads
            AS RESTRICTIVE
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

    # Restore original comment
    op.execute("""
        COMMENT ON POLICY "Space and org threads require app authorization" ON threads IS
        'Defense-in-depth (RESTRICTIVE): Blocks direct database access to space/org threads.
         Application layer must use service role after SpiceDB authorization.
         RESTRICTIVE mode ensures this requirement is enforced with AND logic, not OR.
         Personal threads use separate RLS policies (migration 19f86983628b).';
    """)
