"""align_all_schemas_with_models

Comprehensive migration to align Supabase schema with SQLAlchemy models.

This migration:
1. Cleans up duplicate/unused enum types
2. Creates missing enum types
3. Adds missing columns to existing tables
4. Fixes type mismatches (timestamps, numerics)
5. Ensures all models match Supabase schema

Revision ID: 20251025_align_schemas
Revises: 5b44e667b3ee
Create Date: 2025-10-25 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251025_align_schemas'
down_revision: Union[str, Sequence[str], None] = '5b44e667b3ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Align all schemas with SQLAlchemy models."""

    # ============================================
    # Phase 1: Clean Up Duplicate/Unused Enums
    # ============================================

    # Drop duplicate 'memberrole' enum (we use 'member_role')
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memberrole') THEN
                DROP TYPE memberrole;
            END IF;
        END
        $$;
    """)

    # Drop unused 'document_type' enum (not used by any table currently)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
                DROP TYPE document_type;
            END IF;
        END
        $$;
    """)

    # ============================================
    # Phase 2: Create Missing Enum Types
    # ============================================

    # Create document_status enum (Python enum exists, database enum doesn't)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
                CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'processed', 'failed');
            END IF;
        END
        $$;
    """)

    # Note: query_status and user_role already exist in Supabase
    # member_role already exists in Supabase

    # ============================================
    # Phase 3: Add Missing Columns
    # ============================================

    # Add missing columns to users table
    # Note: These columns exist in Supabase but not in original model
    # auth_user_id, role, is_active, last_login_at already exist in Supabase
    # We're adding bio which is in the model but not in Supabase
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS bio VARCHAR(500);
    """)

    # Add missing columns to documents table
    # Add extracted_text field (content already exists in Supabase)
    op.execute("""
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS extracted_text TEXT;
    """)

    # ============================================
    # Phase 4: Fix Type Mismatches
    # ============================================

    # Fix queries.completed_at from TEXT to TIMESTAMPTZ
    # Only alter if the column exists and is TEXT type
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries'
                AND column_name = 'completed_at'
                AND data_type = 'text'
            ) THEN
                ALTER TABLE queries
                ALTER COLUMN completed_at TYPE TIMESTAMPTZ
                USING CASE
                    WHEN completed_at IS NULL THEN NULL
                    WHEN completed_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN completed_at::TIMESTAMPTZ
                    ELSE NULL
                END;
            END IF;
        END
        $$;
    """)

    # Fix document_chunks.created_at to use TIMESTAMPTZ
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'document_chunks'
                AND column_name = 'created_at'
                AND data_type = 'timestamp without time zone'
            ) THEN
                ALTER TABLE document_chunks
                ALTER COLUMN created_at TYPE TIMESTAMPTZ
                USING created_at AT TIME ZONE 'UTC';
            END IF;
        END
        $$;
    """)

    # Fix document_chunks.updated_at to use server default if missing
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'document_chunks'
                AND column_name = 'updated_at'
                AND column_default IS NULL
            ) THEN
                ALTER TABLE document_chunks
                ALTER COLUMN updated_at SET DEFAULT now();
            END IF;
        END
        $$;
    """)

    # Fix documents.processed_at to use correct timestamp type (no timezone per Supabase)
    # This is already correct in Supabase as 'timestamp without time zone'

    # ============================================
    # Phase 5: Ensure QueryDocument Table Exists
    # ============================================

    # Create query_documents table if it doesn't exist
    # (It already exists in Supabase, but this ensures it matches the model)
    op.execute("""
        CREATE TABLE IF NOT EXISTS query_documents (
            id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            query_id UUID NOT NULL REFERENCES queries(id),
            document_id UUID NOT NULL REFERENCES documents(id),
            relevance_score NUMERIC
        );
    """)

    # Create indexes if they don't exist
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_query_documents_id ON query_documents(id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_query_documents_query_id ON query_documents(query_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_query_documents_document_id ON query_documents(document_id);
    """)

    # ============================================
    # Phase 6: Document Status Enum Migration
    # ============================================
    # NOTE: We're NOT altering documents.status to use enum yet
    # because that would require data migration
    # Future migration can handle converting VARCHAR to ENUM

    print("✅ Schema alignment complete!")
    print("   - Cleaned up duplicate enums (memberrole, document_type)")
    print("   - Created document_status enum")
    print("   - Added missing columns (users.bio, documents.extracted_text)")
    print("   - Fixed timestamp types (queries.completed_at, document_chunks.created_at)")
    print("   - Ensured query_documents table exists")


def downgrade() -> None:
    """Revert schema alignment changes."""

    # Remove added columns
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS bio;")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS extracted_text;")

    # Revert type changes
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries'
                AND column_name = 'completed_at'
                AND data_type = 'timestamp with time zone'
            ) THEN
                ALTER TABLE queries
                ALTER COLUMN completed_at TYPE TEXT
                USING completed_at::TEXT;
            END IF;
        END
        $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'document_chunks'
                AND column_name = 'created_at'
                AND data_type = 'timestamp with time zone'
            ) THEN
                ALTER TABLE document_chunks
                ALTER COLUMN created_at TYPE TIMESTAMP
                USING created_at::TIMESTAMP;
            END IF;
        END
        $$;
    """)

    # Drop document_status enum
    op.execute("DROP TYPE IF EXISTS document_status;")

    print("⏮️ Schema alignment reverted")
