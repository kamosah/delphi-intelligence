"""Validate SpiceDB relationship consistency for threads.

This script checks that all threads in the database have corresponding
relationships in SpiceDB for proper authorization.

Usage:
    docker compose exec api python scripts/validate_spicedb_relationships.py
"""

import asyncio
import logging
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.thread import Thread as ThreadModel
from app.services.spicedb_service import get_spicedb_service
from app.schemas.spicedb import CheckPermissionInput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def validate_thread_relationships():  # noqa: PLR0915
    """Validate that all threads have correct SpiceDB relationships."""
    logger.info("Starting SpiceDB relationship validation...")

    # Setup database connection
    engine = create_async_engine(settings.db_url, echo=False)
    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    spicedb = get_spicedb_service()

    validation_results = {
        "total_threads": 0,
        "missing_owner": [],
        "missing_organization": [],
        "missing_space": [],
        "errors": [],
        "correct": [],
    }

    async with async_session_maker() as session:
        # Get all threads
        result = await session.execute(select(ThreadModel))
        threads = result.scalars().all()

        validation_results["total_threads"] = len(threads)
        logger.info(f"Found {len(threads)} threads to validate")

        for thread in threads:
            thread_id = str(thread.id)
            owner_id = str(thread.owner_user_id)
            org_id = str(thread.organization_id) if thread.organization_id else None
            space_id = str(thread.space_id) if thread.space_id else None

            is_valid = True

            # Check owner relationship (required for all threads)
            try:
                has_owner = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=owner_id,
                        permission="delete",  # Owner should be able to delete
                        resource_type="thread",
                        resource_id=thread_id,
                    )
                )

                if not has_owner:
                    validation_results["missing_owner"].append({
                        "thread_id": thread_id,
                        "owner_user_id": owner_id,
                    })
                    is_valid = False
                    logger.warning(
                        f"Thread {thread_id} missing owner relationship for user {owner_id}"
                    )
            except Exception as e:
                logger.exception(f"Error checking owner relationship for thread {thread_id}")
                validation_results["errors"].append({
                    "thread_id": thread_id,
                    "error": str(e),
                    "check_type": "owner",
                })
                is_valid = False

            # Check organization relationship (required if org_id exists)
            if org_id:
                try:
                    # Verify org relationship grants read_org permission
                    has_org_permission = await spicedb.check_permission(
                        CheckPermissionInput(
                            user_id=owner_id,
                            permission="read_org",  # Org-wide thread read permission
                            resource_type="thread",
                            resource_id=thread_id,
                        )
                    )

                    if not has_org_permission:
                        validation_results["missing_organization"].append({
                            "thread_id": thread_id,
                            "organization_id": org_id,
                            "owner_user_id": owner_id,
                        })
                        is_valid = False
                        logger.warning(f"Thread {thread_id} missing organization relationship")
                except Exception as e:
                    logger.exception(f"Error checking org relationship for thread {thread_id}")
                    validation_results["errors"].append({
                        "thread_id": thread_id,
                        "error": str(e),
                        "check_type": "organization",
                    })
                    is_valid = False

            # Check space relationship (required if space_id exists)
            if space_id:
                try:
                    # Verify space relationship grants read permission
                    has_space_permission = await spicedb.check_permission(
                        CheckPermissionInput(
                            user_id=owner_id,
                            permission="read",  # Space thread read permission
                            resource_type="thread",
                            resource_id=thread_id,
                        )
                    )

                    if not has_space_permission:
                        validation_results["missing_space"].append({
                            "thread_id": thread_id,
                            "space_id": space_id,
                            "organization_id": org_id,
                            "owner_user_id": owner_id,
                        })
                        is_valid = False
                        logger.warning(f"Thread {thread_id} missing space relationship")
                except Exception as e:
                    logger.exception(f"Error checking space relationship for thread {thread_id}")
                    validation_results["errors"].append({
                        "thread_id": thread_id,
                        "error": str(e),
                        "check_type": "space",
                    })
                    is_valid = False

            if is_valid:
                validation_results["correct"].append(thread_id)

    await engine.dispose()

    # Print results
    logger.info("\n%s", "=" * 80)
    logger.info("VALIDATION RESULTS")
    logger.info("%s", "=" * 80)
    logger.info(f"Total threads: {validation_results['total_threads']}")
    logger.info(f"Correct: {len(validation_results['correct'])}")
    logger.info(f"Missing owner relationship: {len(validation_results['missing_owner'])}")
    logger.info(
        f"Missing organization relationship: {len(validation_results['missing_organization'])}"
    )
    logger.info(f"Missing space relationship: {len(validation_results['missing_space'])}")
    logger.info(f"Errors during validation: {len(validation_results['errors'])}")

    if validation_results["missing_owner"]:
        logger.warning("\nThreads missing owner relationships:")
        for item in validation_results["missing_owner"][:10]:  # Show first 10
            logger.warning(f"  - Thread: {item['thread_id']}, Owner: {item['owner_user_id']}")
        if len(validation_results["missing_owner"]) > 10:
            logger.warning(f"  ... and {len(validation_results['missing_owner']) - 10} more")

    # Report missing organization relationships
    if validation_results["missing_organization"]:
        logger.warning("\nThreads missing organization relationships:")
        for item in validation_results["missing_organization"][:10]:
            logger.warning(f"  - Thread: {item['thread_id']}, Org: {item['organization_id']}")
        if len(validation_results["missing_organization"]) > 10:
            logger.warning(f"  ... and {len(validation_results['missing_organization']) - 10} more")

    # Report missing space relationships
    if validation_results["missing_space"]:
        logger.warning("\nThreads missing space relationships:")
        for item in validation_results["missing_space"][:10]:
            logger.warning(f"  - Thread: {item['thread_id']}, Space: {item['space_id']}")
        if len(validation_results["missing_space"]) > 10:
            logger.warning(f"  ... and {len(validation_results['missing_space']) - 10} more")

    # Report errors
    if validation_results["errors"]:
        logger.error("\nErrors during validation:")
        for item in validation_results["errors"][:10]:
            logger.error(
                f"  - Thread: {item['thread_id']}, Check: {item['check_type']}, Error: {item['error']}"
            )
        if len(validation_results["errors"]) > 10:
            logger.error(f"  ... and {len(validation_results['errors']) - 10} more")

    # Update failure condition
    has_failures = (
        validation_results["missing_owner"]
        or validation_results["missing_organization"]
        or validation_results["missing_space"]
        or validation_results["errors"]
    )

    if has_failures:
        logger.error("\n❌ Validation FAILED - missing relationships or errors found")
        logger.info(
            "Run backfill script: docker compose exec api python scripts/backfill_thread_ownership.py"
        )
        return False
    logger.info("\n✅ Validation PASSED - all threads have correct relationships")
    return True


async def main():
    """Run validation."""
    success = await validate_thread_relationships()
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
