"""Backfill thread ownership relationships in SpiceDB.

This script migrates existing threads to use the new owner relation
in SpiceDB (LOG-255). It reads all threads from the database and creates
the corresponding relationships in SpiceDB.

Usage:
    docker compose exec api python scripts/backfill_thread_ownership.py
"""

import asyncio
import logging
from sqlalchemy import select

from app.db.session import get_session_factory
from app.models.thread import Thread
from app.services.spicedb_service import get_spicedb_service
from app.schemas.spicedb import WriteRelationshipInput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backfill_thread_ownership():
    """Backfill thread ownership relationships."""
    logger.info("Starting thread ownership backfill...")

    spicedb = get_spicedb_service()
    session_factory = get_session_factory()

    async with session_factory() as session:
        # Get all threads
        result = await session.execute(select(Thread))
        threads = result.scalars().all()

        total = len(threads)
        logger.info(f"Found {total} threads to backfill")

        if total == 0:
            logger.info("No threads to backfill. Exiting.")
            return

        success_count = 0
        error_count = 0
        errors = []

        for idx, thread in enumerate(threads, 1):
            try:
                # Validate thread has an owner
                if not thread.owner_user_id:
                    logger.warning(f"Thread {thread.id} has no owner_user_id, skipping...")
                    error_count += 1
                    continue

                # Write owner relationship (uses owner_user_id from LOG-254)
                await spicedb.write_relationship(
                    WriteRelationshipInput(
                        resource_type="thread",
                        resource_id=str(thread.id),
                        relation="owner",
                        subject_type="user",
                        subject_id=str(thread.owner_user_id),
                    )
                )

                # Write organization relationship if present
                if thread.organization_id:
                    await spicedb.write_relationship(
                        WriteRelationshipInput(
                            resource_type="thread",
                            resource_id=str(thread.id),
                            relation="organization",
                            subject_type="organization",
                            subject_id=str(thread.organization_id),
                        )
                    )

                # Write space relationship if present
                if thread.space_id:
                    await spicedb.write_relationship(
                        WriteRelationshipInput(
                            resource_type="thread",
                            resource_id=str(thread.id),
                            relation="space",
                            subject_type="space",
                            subject_id=str(thread.space_id),
                        )
                    )

                success_count += 1

                if idx % 100 == 0:
                    logger.info(f"Progress: {idx}/{total} threads processed")

            except Exception as e:
                error_count += 1
                error_msg = f"Thread {thread.id}: {str(e)}"
                errors.append(error_msg)
                logger.exception(f"Failed to backfill thread {thread.id}: {e}")

        logger.info("=" * 60)
        logger.info("✅ Backfill complete!")
        logger.info(f"   Total threads: {total}")
        logger.info(f"   Successful: {success_count}")
        logger.info(f"   Errors: {error_count}")
        logger.info("=" * 60)

        if errors:
            logger.error("Errors encountered:")
            for error in errors[:10]:  # Show first 10 errors
                logger.error(f"  - {error}")
            if len(errors) > 10:
                logger.error(f"  ... and {len(errors) - 10} more errors")


async def main():
    """Run backfill."""
    await backfill_thread_ownership()


if __name__ == "__main__":
    asyncio.run(main())
