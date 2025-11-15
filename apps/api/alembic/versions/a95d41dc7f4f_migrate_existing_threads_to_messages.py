"""migrate_existing_threads_to_messages

This migration backfills the messages table with data from existing threads,
converting single query-response pairs into multi-turn conversation format.

For each existing thread:
1. Create user message from query_text
2. Create assistant message from result (if exists)
3. Migrate sources/confidence_score to assistant message metadata
4. Preserve original timestamps

Revision ID: a95d41dc7f4f
Revises: 3a65059eb513
Create Date: 2025-11-15 16:08:09.971988

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a95d41dc7f4f'
down_revision: Union[str, Sequence[str], None] = '3a65059eb513'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migrate existing threads to messages format."""
    # Get database connection
    conn = op.get_bind()

    # Fetch all existing threads
    threads = conn.execute(
        sa.text("""
            SELECT id, query_text, result, sources, confidence_score,
                   created_at, updated_at
            FROM threads
            WHERE query_text IS NOT NULL
        """)
    ).fetchall()

    # Migrate each thread to messages
    for thread in threads:
        thread_id = thread[0]
        query_text = thread[1]
        result = thread[2]
        sources = thread[3]  # JSONB
        confidence_score = thread[4]
        created_at = thread[5]
        updated_at = thread[6]

        # Create user message from query_text
        conn.execute(
            sa.text("""
                INSERT INTO messages (thread_id, message_role, content, metadata, created_at, updated_at)
                VALUES (:thread_id, 'user', :content, '{}', :created_at, :created_at)
            """),
            {
                "thread_id": thread_id,
                "content": query_text,
                "created_at": created_at,
            }
        )

        # Create assistant message from result (if exists)
        if result:
            # Build metadata for assistant message
            metadata = {}
            if sources and isinstance(sources, dict):
                metadata["citations"] = sources.get("citations", [])
            if confidence_score is not None:
                metadata["confidence_score"] = float(confidence_score)

            conn.execute(
                sa.text("""
                    INSERT INTO messages (thread_id, message_role, content, metadata, created_at, updated_at)
                    VALUES (:thread_id, 'assistant', :content, CAST(:metadata AS jsonb), :updated_at, :updated_at)
                """),
                {
                    "thread_id": thread_id,
                    "content": result,
                    "metadata": json.dumps(metadata),
                    "updated_at": updated_at,
                }
            )


def downgrade() -> None:
    """Remove migrated messages (cannot fully reverse)."""
    # Delete all messages (this will cascade from threads)
    # Note: This doesn't restore the original thread data structure,
    # it just cleans up the messages table
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM messages"))
