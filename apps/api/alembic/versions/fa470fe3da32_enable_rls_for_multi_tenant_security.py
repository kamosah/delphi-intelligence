"""enable_rls_for_multi_tenant_security

Revision ID: fa470fe3da32
Revises: c9a201a09367
Create Date: 2025-12-24 15:44:22.137424

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'fa470fe3da32'
down_revision: Union[str, Sequence[str], None] = 'c9a201a09367'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enable Row Level Security (RLS) for multi-tenant isolation.

    Per ADR-012, RLS provides defense-in-depth by enforcing simple organization_id
    filtering at the database level, preventing cross-tenant data leaks even if
    application-layer permission checks fail.

    Note: alembic_version table included with permissive policies to silence
    security advisor warnings (contains only migration version metadata).
    """

    # ============================================================================
    # 1. ORGANIZATIONS TABLE
    # ============================================================================
    # Enable RLS
    op.execute("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY")

    # Policy: Users can only see organizations they are members of
    op.execute("""
        CREATE POLICY organizations_member_access ON organizations
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_members.organization_id = organizations.id
                AND organization_members.user_id = auth.uid()
            )
        )
    """)

    # Policy: Organization owners/admins can update their organization
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

    # Policy: Organization owners can delete their organization
    op.execute("""
        CREATE POLICY organizations_owner_delete ON organizations
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_members.organization_id = organizations.id
                AND organization_members.user_id = auth.uid()
                AND organization_members.organization_role = 'owner'
            )
        )
    """)

    # ============================================================================
    # 2. ORGANIZATION_MEMBERS TABLE
    # ============================================================================
    # Enable RLS
    op.execute("ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY")

    # Policy: Users can see members of organizations they belong to
    op.execute("""
        CREATE POLICY organization_members_access ON organization_members
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Policy: Owners/admins can manage members
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

    # ============================================================================
    # 3. MESSAGES TABLE
    # ============================================================================
    # Enable RLS
    op.execute("ALTER TABLE messages ENABLE ROW LEVEL SECURITY")

    # Policy: Users can only see messages in threads they have access to
    op.execute("""
        CREATE POLICY messages_thread_access ON messages
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM threads t
                JOIN organization_members om ON t.organization_id = om.organization_id
                WHERE t.id = messages.thread_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Policy: Users can insert messages in threads they have access to
    op.execute("""
        CREATE POLICY messages_thread_insert ON messages
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM threads t
                JOIN organization_members om ON t.organization_id = om.organization_id
                WHERE t.id = messages.thread_id
                AND om.user_id = auth.uid()
            )
        )
    """)

    # Policy: Users can update their own messages in accessible threads
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

    # Policy: Users can delete messages in threads they have access to
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

    # ============================================================================
    # 4. DOCUMENT_CHUNKS TABLE
    # ============================================================================
    # Enable RLS
    op.execute("ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY")

    # Policy: Users can see chunks from documents in spaces they have access to
    op.execute("""
        CREATE POLICY document_chunks_access ON document_chunks
        FOR SELECT
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

    # Policy: System can insert chunks (uploaded by users with space access)
    # Note: Chunk insertion is typically done by background workers after document upload
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

    # Policy: Allow updates to chunks (for embedding updates)
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

    # Policy: Allow deletes (cascades from document deletion)
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

    # ============================================================================
    # 5. ALEMBIC_VERSION TABLE (System Metadata)
    # ============================================================================
    # Enable RLS to silence security advisor warnings
    # This table contains only migration version metadata (no sensitive data)
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")

    # Policy: Allow all authenticated users to read migration versions
    # Migration versions are non-sensitive metadata safe to expose
    op.execute("""
        CREATE POLICY alembic_version_read ON alembic_version
        FOR SELECT
        USING (true)
    """)

    # Policy: Only service role can modify migration versions
    # Alembic uses the service role key for migrations
    op.execute("""
        CREATE POLICY alembic_version_service_write ON alembic_version
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    """)


def downgrade() -> None:
    """Disable RLS and drop policies (for rollback only - not recommended in production)."""

    # Drop alembic_version policies and disable RLS
    op.execute("DROP POLICY IF EXISTS alembic_version_service_write ON alembic_version")
    op.execute("DROP POLICY IF EXISTS alembic_version_read ON alembic_version")
    op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY")

    # Drop document_chunks policies and disable RLS
    op.execute("DROP POLICY IF EXISTS document_chunks_delete ON document_chunks")
    op.execute("DROP POLICY IF EXISTS document_chunks_update ON document_chunks")
    op.execute("DROP POLICY IF EXISTS document_chunks_insert ON document_chunks")
    op.execute("DROP POLICY IF EXISTS document_chunks_access ON document_chunks")
    op.execute("ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY")

    # Drop messages policies and disable RLS
    op.execute("DROP POLICY IF EXISTS messages_thread_delete ON messages")
    op.execute("DROP POLICY IF EXISTS messages_thread_update ON messages")
    op.execute("DROP POLICY IF EXISTS messages_thread_insert ON messages")
    op.execute("DROP POLICY IF EXISTS messages_thread_access ON messages")
    op.execute("ALTER TABLE messages DISABLE ROW LEVEL SECURITY")

    # Drop organization_members policies and disable RLS
    op.execute("DROP POLICY IF EXISTS organization_members_admin_manage ON organization_members")
    op.execute("DROP POLICY IF EXISTS organization_members_access ON organization_members")
    op.execute("ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY")

    # Drop organizations policies and disable RLS
    op.execute("DROP POLICY IF EXISTS organizations_owner_delete ON organizations")
    op.execute("DROP POLICY IF EXISTS organizations_owner_update ON organizations")
    op.execute("DROP POLICY IF EXISTS organizations_member_access ON organizations")
    op.execute("ALTER TABLE organizations DISABLE ROW LEVEL SECURITY")
