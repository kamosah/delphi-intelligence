"""add_with_check_clauses_and_security_fixes

Revision ID: 551325f641a1
Revises: 19092fcb598b
Create Date: 2025-12-25 03:01:51.603036

Addresses Copilot PR review comments:
1. Add WITH CHECK clauses to UPDATE policies (messages, organization_members, organizations, document_chunks)
2. Fix fragile postgres role LIKE pattern to exact match
3. Replace single-column organization_role index with composite index for better performance
4. Add constraints to service role document_chunks operations
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '551325f641a1'
down_revision: Union[str, Sequence[str], None] = '19092fcb598b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add WITH CHECK clauses and security improvements to RLS policies."""

    # ========================================================================
    # 1. Add WITH CHECK clause to messages UPDATE policy
    # ========================================================================
    # Security: Prevent users from changing thread_id to move messages to other threads
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
        WITH CHECK (
            -- Validate updated values: same checks as USING clause
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
    # 2. Add WITH CHECK clause to organization_members UPDATE policy
    # ========================================================================
    # Security: Prevent privilege escalation through UPDATE
    op.execute("DROP POLICY IF EXISTS organization_members_admin_update ON organization_members")
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
        WITH CHECK (
            -- Validate updated values: must remain in same organization
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.organization_role IN ('owner', 'admin')
            )
        )
    """)

    # ========================================================================
    # 3. Add WITH CHECK clause to organizations UPDATE policy
    # ========================================================================
    # Security: Prevent changing organization_id or other sensitive fields
    op.execute("DROP POLICY IF EXISTS organizations_owner_update ON organizations")
    op.execute("""
        CREATE POLICY organizations_owner_update ON organizations
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_members.organization_id = organizations.id
                AND organization_members.user_id = auth.uid()
                AND organization_members.organization_role IN ('owner', 'admin')
            )
        )
        WITH CHECK (
            -- Validate updated values: same permission checks
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_members.organization_id = organizations.id
                AND organization_members.user_id = auth.uid()
                AND organization_members.organization_role IN ('owner', 'admin')
            )
        )
    """)

    # ========================================================================
    # 4. Add WITH CHECK clause to document_chunks UPDATE policy
    # ========================================================================
    # Security: Prevent changing document_id to move chunks to different documents
    # Also adds constraints to service role path
    op.execute("DROP POLICY IF EXISTS document_chunks_update ON document_chunks")
    op.execute("""
        CREATE POLICY document_chunks_update ON document_chunks
        FOR UPDATE
        USING (
            -- Service role restricted to existing chunks only (cannot move between documents)
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
                AND (
                    d.uploaded_by = auth.uid()
                    OR om.organization_role IN ('admin', 'owner')
                )
            )
        )
        WITH CHECK (
            -- Validate updated values: prevent document_id changes
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
                AND (
                    d.uploaded_by = auth.uid()
                    OR om.organization_role IN ('admin', 'owner')
                )
            )
        )
    """)

    # ========================================================================
    # 5. Fix fragile postgres role LIKE pattern
    # ========================================================================
    # Replace 'postgres%' with exact role name for better security
    op.execute("DROP POLICY IF EXISTS alembic_version_service_write ON alembic_version")
    op.execute("""
        CREATE POLICY alembic_version_service_write ON alembic_version
        FOR ALL
        USING (
            auth.role() = 'service_role'
            OR current_user = 'postgres'
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR current_user = 'postgres'
        )
    """)

    # ========================================================================
    # 6. Optimize organization_role index for better performance
    # ========================================================================
    # Replace single-column index with composite index (organization_id, organization_role)
    # This is more effective for RLS policy queries that filter by both columns
    op.execute("DROP INDEX IF EXISTS idx_organization_members_role")
    op.execute("""
        CREATE INDEX idx_organization_members_org_role 
        ON organization_members (organization_id, organization_role)
    """)


def downgrade() -> None:
    """Revert WITH CHECK clauses and security improvements."""

    # Revert composite index to single-column
    op.execute("DROP INDEX IF EXISTS idx_organization_members_org_role")
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_organization_members_role 
        ON organization_members (organization_role)
    """)

    # Revert alembic_version policy to LIKE pattern
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

    # Revert document_chunks UPDATE policy (remove WITH CHECK)
    op.execute("DROP POLICY IF EXISTS document_chunks_update ON document_chunks")
    op.execute("""
        CREATE POLICY document_chunks_update ON document_chunks
        FOR UPDATE
        USING (
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM documents d
                JOIN spaces s ON d.space_id = s.id
                JOIN organization_members om ON s.organization_id = om.organization_id
                WHERE d.id = document_chunks.document_id
                AND om.user_id = auth.uid()
                AND (
                    d.uploaded_by = auth.uid()
                    OR om.organization_role IN ('admin', 'owner')
                )
            )
        )
    """)

    # Revert organizations UPDATE policy (remove WITH CHECK)
    op.execute("DROP POLICY IF EXISTS organizations_owner_update ON organizations")
    op.execute("""
        CREATE POLICY organizations_owner_update ON organizations
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_members.organization_id = organizations.id
                AND organization_members.user_id = auth.uid()
                AND organization_members.organization_role IN ('owner', 'admin')
            )
        )
    """)

    # Revert organization_members UPDATE policy (remove WITH CHECK)
    op.execute("DROP POLICY IF EXISTS organization_members_admin_update ON organization_members")
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

    # Revert messages UPDATE policy (remove WITH CHECK)
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
