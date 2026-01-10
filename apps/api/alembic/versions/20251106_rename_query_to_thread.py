"""rename query to thread + add organization support (ADR-006, LOG-201)

This migration handles:
1. Create minimal organizations table for multi-tenant support
2. Add organization_id to threads and spaces
3. Rename Query → Thread throughout schema
4. Make space_id optional in threads (for org-wide threads)

Revision ID: 20251106_rename_query
Revises: dd3d9f33c4de
Create Date: 2025-11-06 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '20251106_rename_query'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '1f375c83b052'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Add organization support and rename Query → Thread.

    Migration steps:
    1. Create organizations table
    2. Add organization_id to spaces and threads
    3. Backfill organization_id (create default org)
    4. Rename Query → Thread (tables, columns, enums, constraints)
    5. Make space_id optional in threads
    """

    # ========================================
    # PART 1: Create Organizations Table
    # ========================================

    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes for organizations
    op.create_index('idx_organizations_slug', 'organizations', ['slug'], unique=True)
    op.create_index('idx_organizations_owner_id', 'organizations', ['owner_id'])


    # ========================================
    # PART 2: Add organization_id to spaces
    # ========================================

    # Add organization_id column to spaces (nullable initially)
    op.add_column('spaces', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Create a default organization for existing spaces
    op.execute("""
        INSERT INTO organizations (id, name, slug, owner_id)
        SELECT
            gen_random_uuid(),
            'Default Organization',
            'default-org',
            (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
        ON CONFLICT DO NOTHING;
    """)

    # Backfill organization_id for all spaces
    op.execute("""
        UPDATE spaces
        SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org')
        WHERE organization_id IS NULL;
    """)

    # Make organization_id NOT NULL after backfill
    op.alter_column('spaces', 'organization_id', nullable=False)

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_spaces_organization_id',
        'spaces', 'organizations',
        ['organization_id'], ['id'],
        ondelete='CASCADE'
    )

    # Create index for spaces.organization_id
    op.create_index('idx_spaces_organization_id', 'spaces', ['organization_id'])


    # ========================================
    # PART 3: Rename Query → Thread
    # ========================================

    # Step 1: Conditionally rename enum type query_status → thread_status
    # (query_status only exists in manual Supabase DBs, not in fresh installs)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'query_status') THEN
                ALTER TYPE query_status RENAME TO thread_status;
            END IF;
        END $$;
    """)

    # Step 2: Rename tables
    op.rename_table('queries', 'threads')
    op.rename_table('query_documents', 'thread_documents')

    # Step 2.5: Drop old foreign key constraints that may have outdated names
    # In manual DBs, the constraint might be named queries_user_id_fkey (from old user_id column)
    # In fresh installs, it's queries_created_by_fkey (from created_by column)
    # We conditionally drop both to handle all cases
    op.execute("""
        DO $$
        BEGIN
            -- Drop queries_user_id_fkey if it exists (manual DB with old column name)
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'queries_user_id_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT queries_user_id_fkey;
            END IF;

            -- Drop queries_created_by_fkey if it exists (fresh install)
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'queries_created_by_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT queries_created_by_fkey;
            END IF;
        END $$;
    """)

    # Recreate the foreign key with correct naming convention
    op.create_foreign_key(
        'fk_threads_created_by',
        'threads', 'users',
        ['created_by'], ['id'],
        ondelete='SET NULL'
    )

    # Step 3: Rename columns in thread_documents
    op.alter_column('thread_documents', 'query_id', new_column_name='thread_id')

    # Step 4: Rename foreign key constraints (using SQLAlchemy ops)
    op.drop_constraint('query_documents_query_id_fkey', 'thread_documents', type_='foreignkey')
    op.create_foreign_key(
        'thread_documents_thread_id_fkey',
        'thread_documents', 'threads',
        ['thread_id'], ['id'],
        ondelete='CASCADE'
    )

    # Step 5: Rename indexes
    # Threads table indexes
    op.execute("ALTER INDEX IF EXISTS idx_queries_space_id RENAME TO idx_threads_space_id;")
    op.execute("ALTER INDEX IF EXISTS idx_queries_created_by RENAME TO idx_threads_created_by;")
    op.execute("ALTER INDEX IF EXISTS idx_queries_status RENAME TO idx_threads_status;")

    # Thread documents table indexes
    op.execute("ALTER INDEX IF EXISTS idx_query_documents_query_id RENAME TO idx_thread_documents_thread_id;")
    op.execute("ALTER INDEX IF EXISTS idx_query_documents_document_id RENAME TO idx_thread_documents_document_id;")


    # ========================================
    # PART 4: Add organization_id to threads
    # ========================================

    # Add organization_id column to threads (nullable initially)
    op.add_column('threads', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Backfill organization_id from spaces
    op.execute("""
        UPDATE threads t
        SET organization_id = s.organization_id
        FROM spaces s
        WHERE t.space_id = s.id
        AND t.organization_id IS NULL;
    """)

    # For threads without space_id (shouldn't exist, but handle gracefully)
    op.execute("""
        UPDATE threads
        SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org')
        WHERE organization_id IS NULL;
    """)

    # Make organization_id NOT NULL after backfill
    op.alter_column('threads', 'organization_id', nullable=False)

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_threads_organization_id',
        'threads', 'organizations',
        ['organization_id'], ['id'],
        ondelete='CASCADE'
    )

    # Create index for threads.organization_id
    op.create_index('idx_threads_organization_id', 'threads', ['organization_id'])

    # Make space_id optional (nullable) for org-wide threads
    # NOTE: It's already nullable in current schema, this is explicit documentation
    op.alter_column('threads', 'space_id', nullable=True)


def downgrade() -> None:
    """Revert organization support and Thread → Query naming.

    Rollback steps:
    1. Remove organization_id from threads
    2. Revert Thread → Query naming
    3. Remove organization_id from spaces
    4. Drop organizations table
    """

    # ========================================
    # PART 1: Remove organization_id from threads
    # ========================================

    op.drop_index('idx_threads_organization_id', table_name='threads')
    op.drop_constraint('fk_threads_organization_id', 'threads', type_='foreignkey')
    op.drop_column('threads', 'organization_id')


    # ========================================
    # PART 2: Revert Thread → Query naming
    # ========================================

    # Step 1: Rename indexes back
    op.execute("ALTER INDEX IF EXISTS idx_threads_space_id RENAME TO idx_queries_space_id;")
    op.execute("ALTER INDEX IF EXISTS idx_threads_created_by RENAME TO idx_queries_created_by;")
    op.execute("ALTER INDEX IF EXISTS idx_threads_status RENAME TO idx_queries_status;")
    op.execute("ALTER INDEX IF EXISTS idx_thread_documents_thread_id RENAME TO idx_query_documents_query_id;")
    op.execute("ALTER INDEX IF EXISTS idx_thread_documents_document_id RENAME TO idx_query_documents_document_id;")

    # Step 2: Drop the standardized foreign key and recreate with original name
    # Conditionally drop fk_threads_created_by if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_threads_created_by'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT fk_threads_created_by;
            END IF;
        END $$;
    """)

    # Recreate with original name from initial schema
    op.create_foreign_key(
        'queries_created_by_fkey',
        'threads', 'users',
        ['created_by'], ['id'],
        ondelete='SET NULL'
    )

    # Step 3: Rename foreign key constraints back (using SQLAlchemy ops)
    op.drop_constraint('thread_documents_thread_id_fkey', 'thread_documents', type_='foreignkey')
    op.create_foreign_key(
        'query_documents_query_id_fkey',
        'thread_documents', 'threads',
        ['thread_id'], ['id'],
        ondelete='CASCADE'
    )

    # Step 4: Rename columns back
    op.alter_column('thread_documents', 'thread_id', new_column_name='query_id')

    # Step 5: Rename tables back
    op.rename_table('threads', 'queries')
    op.rename_table('thread_documents', 'query_documents')

    # Step 5: Conditionally rename enum type back
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thread_status') THEN
                ALTER TYPE thread_status RENAME TO query_status;
            END IF;
        END $$;
    """)


    # ========================================
    # PART 3: Remove organization_id from spaces
    # ========================================

    op.drop_index('idx_spaces_organization_id', table_name='spaces')
    op.drop_constraint('fk_spaces_organization_id', 'spaces', type_='foreignkey')
    op.drop_column('spaces', 'organization_id')


    # ========================================
    # PART 4: Drop organizations table
    # ========================================

    op.drop_index('idx_organizations_slug', table_name='organizations')
    op.drop_index('idx_organizations_owner_id', table_name='organizations')
    op.drop_table('organizations')
