"""Backfill script for syncing existing threads to SpiceDB.

This script should be run once after deploying the thread permissions schema.
It syncs all existing threads to SpiceDB with their organization, space (if applicable),
and creator relationships.

Usage:
    docker compose exec api python scripts/backfill_thread_permissions.py
"""

import asyncio
import logging

from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.thread import Thread
from app.services.spicedb_service import get_spicedb_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backfill_threads() -> None:
    """Backfill all existing threads to SpiceDB."""
    spicedb = get_spicedb_service()
    session_factory = get_session_factory()

    async with session_factory() as db:
        # Fetch all threads
        result = await db.execute(select(Thread))
        threads = result.scalars().all()

        total = len(threads)
        logger.info(f"Found {total} threads to backfill")

        success_count = 0
        failed_count = 0

        for idx, thread in enumerate(threads, 1):
            try:
                # Sync thread relationships to SpiceDB
                success = await spicedb.sync_thread_relationships(
                    thread_id=str(thread.id),
                    organization_id=str(thread.organization_id),
                    creator_id=str(thread.created_by),
                    space_id=str(thread.space_id) if thread.space_id else None,
                )

                if success:
                    success_count += 1
                    logger.info(
                        f"[{idx}/{total}] Successfully synced thread {thread.id} "
                        f"(org={thread.organization_id}, space={thread.space_id or 'org-wide'})"
                    )
                else:
                    failed_count += 1
                    logger.error(f"[{idx}/{total}] Failed to sync thread {thread.id}")

            except Exception as e:
                failed_count += 1
                logger.exception(f"[{idx}/{total}] Error syncing thread {thread.id}: {e}")

    logger.info(
        f"Backfill complete: {success_count} succeeded, {failed_count} failed (total: {total})"
    )

    if failed_count > 0:
        logger.warning(f"{failed_count} threads failed to sync. Review logs for details.")
    else:
        logger.info("All threads successfully synced to SpiceDB!")


if __name__ == "__main__":
    asyncio.run(backfill_threads())
