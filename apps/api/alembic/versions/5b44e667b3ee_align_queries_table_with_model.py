"""align_queries_table_with_model

Revision ID: 5b44e667b3ee
Revises: 20251023_add_timestamps
Create Date: 2025-10-23 17:40:18.927682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b44e667b3ee'  # noqa: F841
down_revision: Union[str, Sequence[str], None] = '20251023_add_timestamps'  # noqa: F841
branch_labels: Union[str, Sequence[str], None] = None  # noqa: F841
depends_on: Union[str, Sequence[str], None] = None  # noqa: F841


def upgrade() -> None:
    """Conditionally align queries table columns with SQLAlchemy model naming conventions.

    Initial schema (3df48089188e) already has: query_text, result, created_by, agent_steps
    This migration handles cases where manual DB had: question, answer, user_id
    """
    # Conditionally rename question → query_text if question exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'question'
            ) THEN
                ALTER TABLE queries RENAME COLUMN question TO query_text;
            END IF;
        END $$;
    """)

    # Conditionally rename answer → result if answer exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'answer'
            ) THEN
                ALTER TABLE queries RENAME COLUMN answer TO result;
            END IF;
        END $$;
    """)

    # Conditionally rename user_id → created_by if user_id exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE queries RENAME COLUMN user_id TO created_by;
            END IF;
        END $$;
    """)

    # Conditionally add agent_steps if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'agent_steps'
            ) THEN
                ALTER TABLE queries ADD COLUMN agent_steps JSONB;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Conditionally revert queries table column renames."""
    # Conditionally rename query_text → question if query_text exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'query_text'
            ) THEN
                ALTER TABLE queries RENAME COLUMN query_text TO question;
            END IF;
        END $$;
    """)

    # Conditionally rename result → answer if result exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'result'
            ) THEN
                ALTER TABLE queries RENAME COLUMN result TO answer;
            END IF;
        END $$;
    """)

    # Conditionally rename created_by → user_id if created_by exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'created_by'
            ) THEN
                ALTER TABLE queries RENAME COLUMN created_by TO user_id;
            END IF;
        END $$;
    """)

    # Drop agent_steps if exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'agent_steps'
            ) THEN
                ALTER TABLE queries DROP COLUMN agent_steps;
            END IF;
        END $$;
    """)
