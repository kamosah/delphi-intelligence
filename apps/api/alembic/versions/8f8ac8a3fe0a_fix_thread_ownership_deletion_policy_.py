"""fix thread ownership deletion policy set null

Implements SET NULL deletion policy for thread ownership fields to preserve threads
when users are deleted. Threads are collaborative content and should not be deleted
when their owner or creator is removed from the system.

**Deletion Behavior**:
- owner_user_id: SET NULL (triggers reassignment to space/org default - future: LOG-260)
- created_by: SET NULL (preserves historical provenance)

**Rationale**: Threads are shared knowledge. Cascade deletion would cause data loss and
break links for other participants. NULL values trigger reassignment logic (future work).

Related: LOG-254
Revision ID: 8f8ac8a3fe0a
Revises: cb66061b586c
Create Date: 2025-12-30 03:24:47.926096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f8ac8a3fe0a'
down_revision: Union[str, Sequence[str], None] = 'cb66061b586c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Change thread ownership to SET NULL on user delete."""
    # Step 1: Drop existing FK constraints (using actual constraint names from database)
    # Use conditional drops to handle both fresh installs and manual DBs
    op.execute("""
        DO $$
        BEGIN
            -- Drop threads_owner_user_id_fkey if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'threads_owner_user_id_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT threads_owner_user_id_fkey;
            END IF;

            -- Drop queries_user_id_fkey if it exists (legacy name from manual DBs)
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'queries_user_id_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT queries_user_id_fkey;
            END IF;

            -- Drop fk_threads_created_by if it exists (from 20251106 migration)
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_threads_created_by'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT fk_threads_created_by;
            END IF;

            -- Drop threads_created_by_fkey if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'threads_created_by_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT threads_created_by_fkey;
            END IF;
        END $$;
    """)

    # Step 2: Make columns nullable (allow NULL when user deleted)
    op.alter_column('threads', 'owner_user_id', nullable=True)
    op.alter_column('threads', 'created_by', nullable=True)

    # Step 3: Re-add FK constraints with ON DELETE SET NULL
    op.create_foreign_key(
        'threads_owner_user_id_fkey',
        'threads',
        'users',
        ['owner_user_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'threads_created_by_fkey',
        'threads',
        'users',
        ['created_by'],
        ['id'],
        ondelete='SET NULL'
    )

    # Step 4: Add column comments for documentation
    op.execute("""
        COMMENT ON COLUMN threads.owner_user_id IS
        'Current owner (mutable). NULL triggers reassignment to space/org default owner.'
    """)
    op.execute("""
        COMMENT ON COLUMN threads.created_by IS
        'Original creator (immutable). Denormalize creator_name at creation for audit trail.'
    """)


def downgrade() -> None:
    """Downgrade schema: Restore CASCADE deletion (NOT RECOMMENDED)."""
    # WARNING: This downgrade will fail if there are any threads with NULL owner_user_id or created_by
    # This is intentional - you should not downgrade after users have been deleted

    # Step 1: Drop FK constraints with SET NULL (conditional for compatibility)
    op.execute("""
        DO $$
        BEGIN
            -- Drop threads_owner_user_id_fkey if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'threads_owner_user_id_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT threads_owner_user_id_fkey;
            END IF;

            -- Drop threads_created_by_fkey if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'threads_created_by_fkey'
                AND table_name = 'threads'
            ) THEN
                ALTER TABLE threads DROP CONSTRAINT threads_created_by_fkey;
            END IF;
        END $$;
    """)

    # Step 2: Make columns NOT NULL (will fail if NULL values exist)
    op.alter_column('threads', 'owner_user_id', nullable=False)
    op.alter_column('threads', 'created_by', nullable=False)

    # Step 3: Re-add FK constraints with CASCADE (original behavior)
    op.create_foreign_key(
        'threads_owner_user_id_fkey',
        'threads',
        'users',
        ['owner_user_id'],
        ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'queries_user_id_fkey',  # Legacy name from when threads were queries
        'threads',
        'users',
        ['created_by'],
        ['id'],
        ondelete='CASCADE'
    )

    # Step 4: Remove column comments
    op.execute("COMMENT ON COLUMN threads.owner_user_id IS NULL")
    op.execute("COMMENT ON COLUMN threads.created_by IS NULL")
