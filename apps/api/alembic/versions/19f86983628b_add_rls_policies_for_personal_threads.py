"""add RLS policies for personal threads

Implements PostgreSQL Row Level Security for personal threads (visibility=PERSONAL).
Personal threads use RLS for simple owner-based access control, while space/org
threads continue using SpiceDB for relationship-based permissions.

Related: LOG-260
Revision ID: 19f86983628b
Revises: 8f8ac8a3fe0a
Create Date: 2025-12-30 15:56:30.555617

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '19f86983628b'
down_revision: Union[str, Sequence[str], None] = '8f8ac8a3fe0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enable RLS policies for personal threads."""

    # Create helper function to check thread ownership
    op.execute("""
        CREATE OR REPLACE FUNCTION public.is_personal_thread_owner(thread_id_param UUID)
        RETURNS BOOLEAN AS $$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM threads
                WHERE id = thread_id_param
                AND visibility = 'personal'
                AND owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)

    # Enable RLS on threads table (if not already enabled)
    op.execute("ALTER TABLE threads ENABLE ROW LEVEL SECURITY;")

    # Policy 1: SELECT - Users can read their own personal threads
    op.execute("""
        CREATE POLICY "Users can read own personal threads" ON threads
            FOR SELECT
            USING (
                visibility = 'personal'
                AND owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            );
    """)

    # Policy 2: INSERT - Users can create personal threads
    op.execute("""
        CREATE POLICY "Users can create personal threads" ON threads
            FOR INSERT
            WITH CHECK (
                visibility = 'personal'
                AND owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            );
    """)

    # Policy 3: UPDATE - Users can update their own personal threads
    op.execute("""
        CREATE POLICY "Users can update own personal threads" ON threads
            FOR UPDATE
            USING (
                visibility = 'personal'
                AND owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            );
    """)

    # Policy 4: DELETE - Users can delete their own personal threads
    op.execute("""
        CREATE POLICY "Users can delete own personal threads" ON threads
            FOR DELETE
            USING (
                visibility = 'personal'
                AND owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            );
    """)

    # Policy 5: Service role bypass (for admin operations)
    op.execute("""
        CREATE POLICY "Service role has full access to personal threads" ON threads
            FOR ALL
            USING (auth.role() = 'service_role');
    """)


def downgrade() -> None:
    """Remove RLS policies for personal threads."""

    # Drop policies in reverse order
    op.execute('DROP POLICY IF EXISTS "Service role has full access to personal threads" ON threads;')
    op.execute('DROP POLICY IF EXISTS "Users can delete own personal threads" ON threads;')
    op.execute('DROP POLICY IF EXISTS "Users can update own personal threads" ON threads;')
    op.execute('DROP POLICY IF EXISTS "Users can create personal threads" ON threads;')
    op.execute('DROP POLICY IF EXISTS "Users can read own personal threads" ON threads;')

    # Drop helper function
    op.execute("DROP FUNCTION IF EXISTS public.is_personal_thread_owner(UUID);")

    # Note: Don't disable RLS entirely - may be used by other policies
