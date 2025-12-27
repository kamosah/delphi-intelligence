"""Test-only cleanup utilities for SpiceDB relationships.

IMPORTANT: These functions are ONLY for test cleanup and should NEVER be used in production code.
They provide bulk deletion capabilities for cleaning up test data between test runs.
"""

import asyncio
import logging
from typing import TYPE_CHECKING

from authzed.api.v1 import DeleteRelationshipsRequest, RelationshipFilter

if TYPE_CHECKING:
    from app.services.spicedb_service import SpiceDBService

logger = logging.getLogger(__name__)


async def delete_all_relationships_for_resource_type(
    client: "SpiceDBService", resource_type: str
) -> bool:
    """Delete all relationships for a specific resource type (TEST ONLY).

    WARNING: This is a DESTRUCTIVE operation that deletes ALL relationships
    for a resource type globally. Only use this for test cleanup.

    NOT parallel-safe - this deletes ALL relationships for the type across
    all tests. For parallel test execution, use delete_relationships_by_ids instead.

    Args:
        client: SpiceDB service instance
        resource_type: The resource type to clear (e.g., "organization", "space")

    Returns:
        True if successful, False otherwise

    Example:
        # Clear all test data for organizations (NOT parallel-safe)
        await delete_all_relationships_for_resource_type(spicedb_service, "organization")
    """
    try:
        # Run synchronous gRPC call in thread pool to avoid blocking event loop
        await asyncio.to_thread(
            client.client.DeleteRelationships,
            DeleteRelationshipsRequest(
                relationship_filter=RelationshipFilter(
                    resource_type=resource_type,
                    # No optional fields = delete ALL relationships for this resource type
                )
            ),
        )

        logger.debug(f"Deleted all relationships for resource_type={resource_type}")
        return True

    except Exception as e:
        logger.exception(f"Failed to delete all relationships for {resource_type}: {e}")
        return False


async def delete_relationships_by_ids(
    client: "SpiceDBService", resource_ids: list[str]
) -> dict[str, int | list[str]]:
    """Delete relationships for specific resource IDs (TEST ONLY - Parallel-safe).

    This function is parallel-safe because it only deletes relationships for
    the specific resource IDs provided, not all relationships of a type.

    Use this with the test_resource_ids fixture to ensure each test cleans up
    only its own relationships, allowing tests to run in parallel without conflicts.

    Args:
        client: SpiceDB service instance
        resource_ids: List of resource IDs to delete relationships for

    Returns:
        Dict with:
            - deleted_count: Number of successfully deleted resource IDs
            - failed_ids: List of IDs that failed to delete

    Example:
        # Parallel-safe cleanup for specific test resources
        result = await delete_relationships_by_ids(
            spicedb_service,
            ["org-test_create_org-abc123", "user-test_create_org-abc123"]
        )
        if result["failed_ids"]:
            logger.warning(f"Cleanup failed for: {result['failed_ids']}")
    """
    deleted_count = 0
    failed_ids = []

    for resource_id in resource_ids:
        try:
            # Delete all relationships where this ID appears as a resource
            # Note: This doesn't delete relationships where the ID appears as a subject
            # For complete cleanup, you may need to delete both resource and subject relationships
            await asyncio.to_thread(
                client.client.DeleteRelationships,
                DeleteRelationshipsRequest(
                    relationship_filter=RelationshipFilter(
                        optional_resource_id=resource_id
                        # Deletes across ALL resource types for this ID
                    )
                ),
            )
            deleted_count += 1
            logger.debug(f"Deleted relationships for resource_id={resource_id}")

        except Exception as e:
            logger.warning(f"Failed to delete relationships for {resource_id}: {e}")
            failed_ids.append(resource_id)

    return {"deleted_count": deleted_count, "failed_ids": failed_ids}
