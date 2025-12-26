"""SpiceDB authorization service for Olympus.

This module provides a centralized authorization service using SpiceDB. All permission checks flow
through this service to ensure consistent, centralized access control.
"""

import logging
from typing import Any
from uuid import UUID

from authzed.api.v1 import (
    CheckPermissionRequest,
    CheckPermissionResponse,
    Consistency,
    DeleteRelationshipsRequest,
    InsecureClient,
    ObjectReference,
    Relationship,
    RelationshipFilter,
    RelationshipUpdate,
    SubjectFilter,
    SubjectReference,
    WriteRelationshipsRequest,
)

from app.config import settings

logger = logging.getLogger(__name__)


class SpiceDBService:
    """Centralized authorization service using SpiceDB.

    This service handles all permission checks and relationship management
    for Olympus using the SpiceDB authorization system.

    Note: Uses AsyncClient for proper async/await support in FastAPI.
    """

    _instance: "SpiceDBService | None" = None

    def __new__(cls) -> "SpiceDBService":
        """Ensure only one instance exists (singleton pattern)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """Initialize the SpiceDB async client."""
        if hasattr(self, "_initialized"):
            return

        if not settings.spicedb_token:
            error_msg = "SPICEDB_TOKEN is required. Set SPICEDB_TOKEN environment variable."
            raise ValueError(error_msg)

        # Use InsecureClient for local development (no TLS)
        self.client = InsecureClient(
            settings.spicedb_endpoint,
            settings.spicedb_token,
        )
        self._initialized = True
        logger.info(
            f"SpiceDB service initialized successfully (endpoint: {settings.spicedb_endpoint})"
        )

    async def check_permission(
        self,
        user_id: str | UUID,
        permission: str,
        resource_type: str,
        resource_id: str | UUID,
        context: dict[str, Any] | None = None,
    ) -> bool:
        """Check if a user has permission on a resource.

        Args:
            user_id: The user attempting the action
            permission: The permission to check (e.g., "read", "update", "delete")
            resource_type: The type of resource (e.g., "organization", "space", "document")
            resource_id: The ID of the resource
            context: Optional context for caveats (e.g., subscription_tier)

        Returns:
            True if the user has permission, False otherwise

        Example:
            if await spicedb.check_permission(user.id, "read", "space", space.id):
                # Allow access
        """
        try:
            response: CheckPermissionResponse = self.client.CheckPermission(
                CheckPermissionRequest(
                    consistency=Consistency(fully_consistent=True),
                    resource=ObjectReference(
                        object_type=resource_type,
                        object_id=str(resource_id),
                    ),
                    permission=permission,
                    subject=SubjectReference(
                        object=ObjectReference(
                            object_type="user",
                            object_id=str(user_id),
                        )
                    ),
                    context=context or {},
                )
            )

            allowed = (
                response.permissionship
                == CheckPermissionResponse.Permissionship.PERMISSIONSHIP_HAS_PERMISSION
            )

            logger.debug(
                f"Permission check: user={user_id}, permission={permission}, "
                f"resource={resource_type}:{resource_id}, allowed={allowed}"
            )

            return bool(allowed)

        except Exception as e:
            logger.exception(
                f"Permission check failed: user={user_id}, permission={permission}, "
                f"resource={resource_type}:{resource_id}: {e}"
            )
            # Fail closed - deny access on errors
            return False

    async def write_relationship(
        self,
        resource_type: str,
        resource_id: str | UUID,
        relation: str,
        subject_type: str,
        subject_id: str | UUID,
        expiration: int | None = None,
    ) -> bool:
        """Write a relationship to SpiceDB.

        Args:
            resource_type: The type of resource (e.g., "organization")
            resource_id: The ID of the resource
            relation: The relation name (e.g., "member", "owner")
            subject_type: The type of subject (usually "user")
            subject_id: The ID of the subject
            expiration: Optional expiration timestamp (seconds since epoch)

        Returns:
            True if successful, False otherwise

        Example:
            # Add user as organization member
            await spicedb.write_relationship(
                "organization", org.id, "member", "user", user.id
            )
        """
        try:
            relationship = Relationship(
                resource=ObjectReference(
                    object_type=resource_type,
                    object_id=str(resource_id),
                ),
                relation=relation,
                subject=SubjectReference(
                    object=ObjectReference(
                        object_type=subject_type,
                        object_id=str(subject_id),
                    )
                ),
            )

            if expiration:
                relationship.optional_expires_at.seconds = expiration

            self.client.WriteRelationships(
                WriteRelationshipsRequest(
                    updates=[
                        RelationshipUpdate(
                            operation=RelationshipUpdate.OPERATION_TOUCH,
                            relationship=relationship,
                        )
                    ]
                )
            )

            logger.debug(
                f"Relationship written: {resource_type}:{resource_id}#{relation}@{subject_type}:{subject_id}"
            )

            return True

        except Exception as e:
            logger.exception(f"Failed to write relationship: {e}")
            return False

    async def delete_relationship(
        self,
        resource_type: str,
        resource_id: str | UUID,
        relation: str,
        subject_type: str,
        subject_id: str | UUID,
    ) -> bool:
        """Delete a relationship from SpiceDB.

        Args:
            resource_type: The type of resource
            resource_id: The ID of the resource
            relation: The relation name
            subject_type: The type of subject
            subject_id: The ID of the subject

        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.DeleteRelationships(
                DeleteRelationshipsRequest(
                    relationship_filter=RelationshipFilter(
                        resource_type=resource_type,
                        optional_resource_id=str(resource_id),
                        optional_relation=relation,
                        optional_subject_filter=SubjectFilter(
                            subject_type=subject_type,
                            optional_subject_id=str(subject_id),
                        ),
                    )
                )
            )

            logger.debug(
                f"Relationship deleted: {resource_type}:{resource_id}#{relation}@{subject_type}:{subject_id}"
            )

            return True

        except Exception as e:
            logger.exception(f"Failed to delete relationship: {e}")
            return False


# Global singleton instance
_spicedb_service: SpiceDBService | None = None


def get_spicedb_service() -> SpiceDBService:
    """Get the global SpiceDB service instance."""
    global _spicedb_service  # noqa: PLW0603
    if _spicedb_service is None:
        _spicedb_service = SpiceDBService()
    return _spicedb_service
