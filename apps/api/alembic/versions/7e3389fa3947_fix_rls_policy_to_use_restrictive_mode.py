"""fix rls policy to use restrictive mode

Fixes critical security issue in defense-in-depth RLS policy (migration 83e918a0b0ba).
The original policy used PERMISSIVE mode (default), which combines with OR logic.
This allows any other permissive policy to grant access, bypassing the service role
requirement.

This migration changes the policy to RESTRICTIVE mode, which uses AND logic. This
ensures the service role requirement is enforced as an additional filter, providing
true defense-in-depth security.

Security Impact:
- BEFORE: User with any permissive policy can access space/org threads (security bypass)
- AFTER: User MUST satisfy service role requirement AND any other policies (true defense)

Related: LOG-262
Revision ID: 7e3389fa3947
Revises: 83e918a0b0ba
Create Date: 2026-01-06 02:38:17.802374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e3389fa3947'
down_revision: Union[str, Sequence[str], None] = '83e918a0b0ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix RLS policy to use RESTRICTIVE mode for true defense-in-depth."""

    # Drop the old permissive policy
    op.execute('DROP POLICY IF EXISTS "Space and org threads require app authorization" ON threads;')

    # Create new RESTRICTIVE policy (uses AND logic instead of OR)
    # This ensures the service role requirement is an additional filter, not an alternative
    op.execute("""
        CREATE POLICY "Space and org threads require app authorization" ON threads
            AS RESTRICTIVE  -- CRITICAL: Uses AND logic for defense-in-depth
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

    # Update comment to reflect RESTRICTIVE mode
    op.execute("""
        COMMENT ON POLICY "Space and org threads require app authorization" ON threads IS
        'Defense-in-depth (RESTRICTIVE): Blocks direct database access to space/org threads.
         Application layer must use service role after SpiceDB authorization.
         RESTRICTIVE mode ensures this requirement is enforced with AND logic, not OR.
         Personal threads use separate RLS policies (migration 19f86983628b).';
    """)


def downgrade() -> None:
    """Revert to permissive policy (NOT RECOMMENDED - security downgrade)."""

    # Drop the restrictive policy
    op.execute('DROP POLICY IF EXISTS "Space and org threads require app authorization" ON threads;')

    # Recreate the old permissive policy (for rollback compatibility only)
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

    # Restore original comment
    op.execute("""
        COMMENT ON POLICY "Space and org threads require app authorization" ON threads IS
        'Defense-in-depth: Blocks direct database access to space/org threads.
         Application layer must use service role after SpiceDB authorization.';
    """)
