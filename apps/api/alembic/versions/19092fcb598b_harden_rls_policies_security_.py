"""harden_rls_policies_security_improvements

Revision ID: 19092fcb598b
Revises: b1dca76ce116
Create Date: 2025-12-24 19:53:02.122651

Addresses Copilot PR review security concerns:
1. Restrict document_chunks update/delete to owner/admin/service role
2. Add organizations INSERT policy for user-created orgs
3. Split organization_members FOR ALL into granular policies
4. Add performance indexes for RLS policy JOINs
5. Restrict alembic_version to postgres role (not any null auth)
6. Add message ownership check to update policy
7. Restrict message delete to owner or admins
8. Allow service role for document_chunks operations
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '19092fcb598b'
down_revision: Union[str, Sequence[str], None] = 'b1dca76ce116'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Harden RLS policies based on security review feedback."""

    # Note: No schema changes needed - messages belong to threads,
    # and threads already have created_by column for ownership tracking

    # ========================================================================
    # 1. FIX: Add organizations INSERT policy
    # ========================================================================
    # Issue: Users cannot create new organizations
    # Solution: Allow authenticated users to create organizations
    op.execute("""
        CREATE POLICY organizations_insert_authenticated ON organizations
        FOR INSERT
        WITH CHECK (
            auth.uid() IS NOT NULL
        )
    """)

    # ========================================================================
    # 2. FIX: Replace organization_members FOR ALL with granular policies
    # ========================================================================
    # Issue: Admins can delete themselves, potentially leaving org without owners
    # Solution: Separate policies with safeguards

    # Drop the overly permissive FOR ALL policy
    op.execute("DROP POLICY IF EXISTS organization_members_admin_manage ON organization_members")

    # INSERT: Owners/admins can add members
    op.execute("""
        CREATE POLICY organization_members_admin_insert ON organization_members
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.organization_role IN ('owner', 'admin')
            )
        )
    """)

    # UPDATE: Owners/admins can update member roles
    op.execute("""
        CREATE POLICY organization_members_admin_update ON organization_members
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.organization_role IN ('owner', 'admin')
            )
        )
    """)

    # DELETE: Owners/admins can remove members, but not the last owner
    # Note: Last owner protection should also be enforced at application layer
    op.execute("""
        CREATE POLICY organization_members_admin_delete ON organization_members
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.organization_role IN ('owner', 'admin')
            )
            AND (
                -- Allow if target is not an owner
                organization_members.organization_role != 'owner'
                -- OR if there are multiple owners
                OR (
                    SELECT COUNT(*) FROM organization_members om2
                    WHERE om2.organization_id = organization_members.organization_id
                    AND om2.organization_role = 'owner'
                ) > 1
            )
        )
    """)

    # ========================================================================
    # 3. FIX: Restrict messages update to thread owners
    # ========================================================================
    # Issue: Any org member can update any message
    # Solution: Only thread owner can update messages in their thread

    op.execute("DROP POLICY IF EXISTS messages_thread_update ON messages")

    op.execute("""
        CREATE POLICY messages_thread_update ON messages
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM threads t
                JOIN organization_members om ON t.organization_id = om.organization_id
                WHERE t.id = messages.thread_id
                AND om.user_id = auth.uid()
                AND t.created_by = auth.uid()
            )
        )
    """)

    # ========================================================================
    # 4. FIX: Restrict messages delete to thread owner or admins
    # ========================================================================
    # Issue: Any org member can delete any message
    # Solution: Only thread owner or org admins can delete

    op.execute("DROP POLICY IF EXISTS messages_thread_delete ON messages")

    op.execute("""
        CREATE POLICY messages_thread_delete ON messages
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM threads t
                JOIN organization_members om ON t.organization_id = om.organization_id
                WHERE t.id = messages.thread_id
                AND om.user_id = auth.uid()
                AND (
                    -- Thread owner
                    t.created_by = auth.uid()
                    -- OR organization admin/owner
                    OR om.organization_role IN ('admin', 'owner')
                )
            )
        )
    """)

    # ========================================================================
    # 5. FIX: Restrict document_chunks update to owner/admin/service role
    # ========================================================================
    # Issue: Any org member can modify chunks
    # Solution: Only document owner, org admins, or service role

    op.execute("DROP POLICY IF EXISTS document_chunks_update ON document_chunks")

    op.execute("""
        CREATE POLICY document_chunks_update ON document_chunks
        FOR UPDATE
        USING (
            -- Service role for background workers
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
                AND (
                    -- Document uploader
                    d.uploaded_by = auth.uid()
                    -- OR organization admin/owner
                    OR om.organization_role IN ('admin', 'owner')
                )
            )
        )
    """)

    # ========================================================================
    # 6. FIX: Restrict document_chunks delete to owner/admin/service role
    # ========================================================================
    # Issue: Any org member can delete chunks
    # Solution: Only document uploader, org admins, or service role

    op.execute("DROP POLICY IF EXISTS document_chunks_delete ON document_chunks")

    op.execute("""
        CREATE POLICY document_chunks_delete ON document_chunks
        FOR DELETE
        USING (
            -- Service role for background workers
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
                AND (
                    -- Document uploader
                    d.uploaded_by = auth.uid()
                    -- OR organization admin/owner
                    OR om.organization_role IN ('admin', 'owner')
                )
            )
        )
    """)

    # ========================================================================
    # 7. FIX: Update document_chunks insert to allow service role
    # ========================================================================
    # Issue: Comment says "system" but policy requires user context
    # Solution: Allow service role OR document owner/admin

    op.execute("DROP POLICY IF EXISTS document_chunks_insert ON document_chunks")

    op.execute("""
        CREATE POLICY document_chunks_insert ON document_chunks
        FOR INSERT
        WITH CHECK (
            -- Service role for background workers (chunking/embedding)
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # ========================================================================
    # 8. FIX: Restrict alembic_version to postgres role specifically
    # ========================================================================
    # Issue: auth.uid() IS NULL allows ANY unauthenticated connection
    # Solution: Check for specific postgres database role

    op.execute("DROP POLICY IF EXISTS alembic_version_service_write ON alembic_version")

    op.execute("""
        CREATE POLICY alembic_version_service_write ON alembic_version
        FOR ALL
        USING (
            auth.role() = 'service_role'
            OR current_user LIKE 'postgres%'
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR current_user LIKE 'postgres%'
        )
    """)

    # ========================================================================
    # 9. ADD: Performance indexes for RLS policy JOINs
    # ========================================================================
    # Issue: RLS policies with JOINs will cause full table scans
    # Solution: Add indexes on foreign key columns used in policies

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id)"
    )
    # Note: idx_messages_created_by was already created in step 0
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id "
        "ON document_chunks (document_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id "
        "ON organization_members (organization_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_organization_members_user_id "
        "ON organization_members (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_organization_members_role "
        "ON organization_members (organization_role)"
    )


def downgrade() -> None:
    """Revert security hardening (not recommended in production)."""

    # Drop performance indexes
    op.execute("DROP INDEX IF EXISTS idx_organization_members_role")
    op.execute("DROP INDEX IF EXISTS idx_organization_members_user_id")
    op.execute("DROP INDEX IF EXISTS idx_organization_members_organization_id")
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_document_id")
    op.execute("DROP INDEX IF EXISTS idx_messages_thread_id")

    # Revert alembic_version policy to less restrictive version
    op.execute("DROP POLICY IF EXISTS alembic_version_service_write ON alembic_version")
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

    # Revert document_chunks insert
    op.execute("DROP POLICY IF EXISTS document_chunks_insert ON document_chunks")
    op.execute("""
        CREATE POLICY document_chunks_insert ON document_chunks
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Revert document_chunks delete
    op.execute("DROP POLICY IF EXISTS document_chunks_delete ON document_chunks")
    op.execute("""
        CREATE POLICY document_chunks_delete ON document_chunks
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Revert document_chunks update
    op.execute("DROP POLICY IF EXISTS document_chunks_update ON document_chunks")
    op.execute("""
        CREATE POLICY document_chunks_update ON document_chunks
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Revert messages delete
    op.execute("DROP POLICY IF EXISTS messages_thread_delete ON messages")
    op.execute("""
        CREATE POLICY messages_thread_delete ON messages
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM threads t
                JOIN organization_members om ON t.organization_id = om.organization_id
                WHERE t.id = messages.thread_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Revert messages update
    op.execute("DROP POLICY IF EXISTS messages_thread_update ON messages")
    op.execute("""
        CREATE POLICY messages_thread_update ON messages
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM threads t
                JOIN organization_members om ON t.organization_id = om.organization_id
                WHERE t.id = messages.thread_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Revert organization_members granular policies to FOR ALL
    op.execute("DROP POLICY IF EXISTS organization_members_admin_delete ON organization_members")
    op.execute("DROP POLICY IF EXISTS organization_members_admin_update ON organization_members")
    op.execute("DROP POLICY IF EXISTS organization_members_admin_insert ON organization_members")

    op.execute("""
        CREATE POLICY organization_members_admin_manage ON organization_members
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.organization_role IN ('owner', 'admin')
            )
        )
    """)

    # Drop organizations INSERT policy
    op.execute("DROP POLICY IF EXISTS organizations_insert_authenticated ON organizations")
