"""SpiceDB authorization service for Olympus.

This module provides a centralized authorization service using SpiceDB. All permission checks flow
through this service to ensure consistent, centralized access control.
"""

import asyncio
import logging

from authzed.api.v1 import (
    CheckPermissionRequest,
    CheckPermissionResponse,
    Client,
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

# grpcutil is bundled with authzed package (not a separate PyPI dependency)
# The authzed package includes grpcutil/__init__.py in its distribution
# Verified in: authzed-1.24.0.dist-info/RECORD
# This import is safe and doesn't require adding grpcutil to pyproject.toml dependencies
from grpcutil import bearer_token_credentials
from pydantic import ValidationError

from app.config import settings
from app.schemas.spicedb import (
    CheckPermissionInput,
    DeleteRelationshipInput,
    WriteRelationshipInput,
)

logger = logging.getLogger(__name__)


class SpiceDBService:
    """Centralized authorization service using SpiceDB.

    This service handles all permission checks and relationship management
    for Olympus using the SpiceDB authorization system.

    Client Selection (environment-based):
    - Development (ENV=development): InsecureClient (no TLS)
    - Production (ENV=production): SecureClient (TLS with bearer token)

    Async Handling:
    The authzed-py library only provides synchronous gRPC clients. To prevent
    blocking FastAPI's event loop, all gRPC calls are wrapped in asyncio.to_thread(),
    which executes them in a thread pool. This maintains async behavior without
    blocking the main event loop.
    """

    _instance: "SpiceDBService | None" = None

    def __new__(cls) -> "SpiceDBService":
        """Ensure only one instance exists (singleton pattern)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """Initialize the SpiceDB client (environment-based)."""
        if hasattr(self, "_initialized"):
            return

        if not settings.spicedb_token:
            error_msg = "SPICEDB_TOKEN is required. Set SPICEDB_TOKEN environment variable."
            raise ValueError(error_msg)

        # Select client based on environment
        use_tls = settings.env == "production"

        if use_tls:
            # Production: Use SecureClient with TLS
            self.client = Client(
                settings.spicedb_endpoint,
                bearer_token_credentials(settings.spicedb_token),
            )
            logger.info(
                f"SpiceDB SecureClient initialized (endpoint: {settings.spicedb_endpoint}, TLS: enabled)"
            )
        else:
            # Development: Use InsecureClient (no TLS)
            self.client = InsecureClient(
                settings.spicedb_endpoint,
                settings.spicedb_token,
            )
            logger.info(
                f"SpiceDB InsecureClient initialized (endpoint: {settings.spicedb_endpoint}, TLS: disabled)"
            )

        self._initialized = True

    async def check_permission(self, input: CheckPermissionInput) -> bool:
        """Check if a user has permission on a resource.

        Args:
            input: Validated permission check parameters

        Returns:
            True if the user has permission, False otherwise

        Example:
            result = await spicedb.check_permission(CheckPermissionInput(
                user_id=user.id,
                permission="read",
                resource_type="space",
                resource_id=space.id
            ))
        """
        try:
            # Run synchronous gRPC call in thread pool to avoid blocking event loop
            response: CheckPermissionResponse = await asyncio.to_thread(
                self.client.CheckPermission,
                CheckPermissionRequest(
                    consistency=Consistency(fully_consistent=True),
                    resource=ObjectReference(
                        object_type=input.resource_type,
                        object_id=str(input.resource_id),
                    ),
                    permission=input.permission,
                    subject=SubjectReference(
                        object=ObjectReference(
                            object_type="user",
                            object_id=str(input.user_id),
                        )
                    ),
                    context=input.context or {},
                ),
            )

            allowed = (
                response.permissionship
                == CheckPermissionResponse.Permissionship.PERMISSIONSHIP_HAS_PERMISSION
            )

            logger.debug(
                f"Permission check: user={input.user_id}, permission={input.permission}, "
                f"resource={input.resource_type}:{input.resource_id}, allowed={allowed}"
            )

            return bool(allowed)

        except ValidationError as e:
            logger.exception(f"Invalid permission check input: {e}")
            # Fail closed - deny access on validation errors
            return False

        except Exception as e:
            logger.exception(
                f"Permission check failed: user={input.user_id}, permission={input.permission}, "
                f"resource={input.resource_type}:{input.resource_id}: "
                f"{type(e).__name__}: {e}"
            )
            # Fail closed - deny access on errors
            return False

    async def write_relationship(self, input: WriteRelationshipInput) -> bool:
        """Write a relationship to SpiceDB.

        Args:
            input: Validated relationship write parameters

        Returns:
            True if successful, False otherwise

        Example:
            result = await spicedb.write_relationship(WriteRelationshipInput(
                resource_type="organization",
                resource_id=org.id,
                relation="member",
                subject_type="user",
                subject_id=user.id
            ))
        """
        try:
            relationship = Relationship(
                resource=ObjectReference(
                    object_type=input.resource_type,
                    object_id=str(input.resource_id),
                ),
                relation=input.relation,
                subject=SubjectReference(
                    object=ObjectReference(
                        object_type=input.subject_type,
                        object_id=str(input.subject_id),
                    )
                ),
            )

            if input.expiration:
                relationship.optional_expires_at.seconds = input.expiration

            # Run synchronous gRPC call in thread pool to avoid blocking event loop
            await asyncio.to_thread(
                self.client.WriteRelationships,
                WriteRelationshipsRequest(
                    updates=[
                        RelationshipUpdate(
                            operation=RelationshipUpdate.OPERATION_TOUCH,
                            relationship=relationship,
                        )
                    ]
                ),
            )

            logger.debug(
                f"Relationship written: {input.resource_type}:{input.resource_id}#{input.relation}@{input.subject_type}:{input.subject_id}"
            )

            return True

        except ValidationError as e:
            logger.exception(f"Invalid relationship write input: {e}")
            return False

        except Exception as e:
            logger.exception(
                f"Failed to write relationship "
                f"{input.resource_type}:{input.resource_id}#{input.relation}@{input.subject_type}:{input.subject_id}: "
                f"{type(e).__name__}: {e}"
            )
            return False

    async def delete_all_relationships_for_resource(
        self, resource_type: str, resource_id: str
    ) -> bool:
        """Delete all relationships for a specific resource (production-safe).

        This method deletes all relationships for ONE specific resource instance
        (e.g., space:123), not all resources of a type. Safe for production use
        when deleting entities from the database.

        Use case: When deleting an entity from PostgreSQL, also delete its SpiceDB
        relationships to keep authorization state in sync with database state.

        Args:
            resource_type: The resource type (e.g., "organization", "space")
            resource_id: The specific resource ID to delete relationships for

        Returns:
            True if successful, False otherwise

        Example:
            # Delete all relationships when deleting a space
            await spicedb.delete_all_relationships_for_resource("space", space_id)
        """
        try:
            # Run synchronous gRPC call in thread pool to avoid blocking event loop
            await asyncio.to_thread(
                self.client.DeleteRelationships,
                DeleteRelationshipsRequest(
                    relationship_filter=RelationshipFilter(
                        resource_type=resource_type,
                        optional_resource_id=str(resource_id),
                        # Deletes ALL relationships for this specific resource
                    )
                ),
            )

            logger.debug(f"Deleted all relationships for {resource_type}:{resource_id}")
            return True

        except Exception as e:
            logger.exception(
                f"Failed to delete relationships for {resource_type}:{resource_id}: {e}"
            )
            return False

    async def delete_relationship(self, input: DeleteRelationshipInput) -> bool:
        """Delete a relationship from SpiceDB.

        Args:
            input: Validated relationship delete parameters

        Returns:
            True if successful, False otherwise

        Example:
            result = await spicedb.delete_relationship(DeleteRelationshipInput(
                resource_type="organization",
                resource_id=org.id,
                relation="member",
                subject_type="user",
                subject_id=user.id
            ))
        """
        try:
            # Run synchronous gRPC call in thread pool to avoid blocking event loop
            await asyncio.to_thread(
                self.client.DeleteRelationships,
                DeleteRelationshipsRequest(
                    relationship_filter=RelationshipFilter(
                        resource_type=input.resource_type,
                        optional_resource_id=str(input.resource_id),
                        optional_relation=input.relation,
                        optional_subject_filter=SubjectFilter(
                            subject_type=input.subject_type,
                            optional_subject_id=str(input.subject_id),
                        ),
                    )
                ),
            )

            logger.debug(
                f"Relationship deleted: {input.resource_type}:{input.resource_id}#{input.relation}@{input.subject_type}:{input.subject_id}"
            )

            return True

        except ValidationError as e:
            logger.exception(f"Invalid relationship delete input: {e}")
            return False

        except Exception as e:
            logger.exception(
                f"Failed to delete relationship "
                f"{input.resource_type}:{input.resource_id}#{input.relation}@{input.subject_type}:{input.subject_id}: "
                f"{type(e).__name__}: {e}"
            )
            return False


# Global singleton instance
_spicedb_service: SpiceDBService | None = None


def get_spicedb_service() -> SpiceDBService:
    """Get the global SpiceDB service instance."""
    global _spicedb_service  # noqa: PLW0603
    if _spicedb_service is None:
        _spicedb_service = SpiceDBService()
    return _spicedb_service
