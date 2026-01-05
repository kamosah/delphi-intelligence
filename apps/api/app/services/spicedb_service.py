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

    # ========================================================================
    # Application-Level Relationship Sync Helpers
    # ========================================================================
    # These methods provide higher-level abstractions for syncing relationships
    # after CRUD operations. Call these from GraphQL mutations/REST endpoints.

    async def sync_organization_owner(self, organization_id: str, owner_id: str) -> bool:
        """Sync organization owner relationship.

        Call this after creating an organization or changing ownership.

        Args:
            organization_id: The organization ID
            owner_id: The new owner's user ID

        Returns:
            True if successful, False otherwise

        Example:
            await spicedb.sync_organization_owner(org.id, user.id)
        """
        return await self.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=organization_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

    async def sync_organization_member(self, organization_id: str, user_id: str, role: str) -> bool:
        """Sync organization member relationship.

        Call this after adding a member to an organization.

        Args:
            organization_id: The organization ID
            user_id: The user ID
            role: The organization role (owner, admin, member, viewer)

        Returns:
            True if successful, False otherwise

        Example:
            await spicedb.sync_organization_member(org.id, user.id, "member")
        """
        return await self.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=organization_id,
                relation=role.lower(),
                subject_type="user",
                subject_id=user_id,
            )
        )

    async def remove_organization_member(
        self, organization_id: str, user_id: str, role: str
    ) -> bool:
        """Remove organization member relationship.

        Call this after removing a member from an organization.

        Args:
            organization_id: The organization ID
            user_id: The user ID
            role: The organization role being removed

        Returns:
            True if successful, False otherwise

        Example:
            await spicedb.remove_organization_member(org.id, user.id, "member")
        """
        return await self.delete_relationship(
            DeleteRelationshipInput(
                resource_type="organization",
                resource_id=organization_id,
                relation=role.lower(),
                subject_type="user",
                subject_id=user_id,
            )
        )

    async def sync_space_relationships(
        self, space_id: str, organization_id: str, owner_id: str
    ) -> bool:
        """Sync space relationships (organization + owner).

        Call this after creating a space.

        Args:
            space_id: The space ID
            organization_id: The parent organization ID
            owner_id: The space owner's user ID

        Returns:
            True if both relationships succeeded, False otherwise

        Example:
            await spicedb.sync_space_relationships(space.id, org.id, user.id)
        """
        # Write both relationships
        org_success = await self.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=organization_id,
            )
        )

        owner_success = await self.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        return org_success and owner_success

    async def sync_space_member(self, space_id: str, user_id: str, role: str) -> bool:
        """Sync space member relationship.

        Call this after adding a member to a space.

        Args:
            space_id: The space ID
            user_id: The user ID
            role: The space role (owner, editor, viewer)

        Returns:
            True if successful, False otherwise

        Example:
            await spicedb.sync_space_member(space.id, user.id, "editor")
        """
        return await self.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation=role.lower(),
                subject_type="user",
                subject_id=user_id,
            )
        )

    async def remove_space_member(self, space_id: str, user_id: str, role: str) -> bool:
        """Remove space member relationship.

        Call this after removing a member from a space.

        Args:
            space_id: The space ID
            user_id: The user ID
            role: The space role being removed

        Returns:
            True if successful, False otherwise

        Example:
            await spicedb.remove_space_member(space.id, user.id, "editor")
        """
        return await self.delete_relationship(
            DeleteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation=role.lower(),
                subject_type="user",
                subject_id=user_id,
            )
        )

    async def sync_document_relationships(
        self, document_id: str, space_id: str, uploader_id: str
    ) -> bool:
        """Sync document relationships (space + uploader).

        Call this after uploading a document.

        Args:
            document_id: The document ID
            space_id: The parent space ID
            uploader_id: The uploader's user ID

        Returns:
            True if both relationships succeeded, False otherwise

        Example:
            await spicedb.sync_document_relationships(doc.id, space.id, user.id)
        """
        # Write both relationships
        space_success = await self.write_relationship(
            WriteRelationshipInput(
                resource_type="document",
                resource_id=document_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )

        uploader_success = await self.write_relationship(
            WriteRelationshipInput(
                resource_type="document",
                resource_id=document_id,
                relation="uploader",
                subject_type="user",
                subject_id=uploader_id,
            )
        )

        return space_success and uploader_success

    async def sync_thread_relationships(
        self,
        *,
        thread_id: str,
        organization_id: str,
        owner_id: str,
        space_id: str | None = None,
    ) -> bool:
        """Sync thread relationships (organization + owner + optional space).

        Call this after creating organization or space threads.

        **Authorization Strategy:**
        - **Org/Space threads**: Use SpiceDB for fine-grained access control
        - **Personal threads**: Use PostgreSQL RLS (to be implemented in future PR)

        Args:
            thread_id: The thread ID
            organization_id: The parent organization ID (REQUIRED - for org/space threads only)
            owner_id: The thread owner's user ID
            space_id: The parent space ID (None for org-wide threads)

        Returns:
            True if all relationships succeeded, False otherwise

        Example:
            # Space thread
            await spicedb.sync_thread_relationships(
                thread_id=thread.id,
                organization_id=org.id,
                owner_id=user.id,
                space_id=space.id,
            )

            # Org-wide thread
            await spicedb.sync_thread_relationships(
                thread_id=thread.id,
                organization_id=org.id,
                owner_id=user.id,
                space_id=None,
            )

            # Personal threads use PostgreSQL RLS (migration 19f86983628b)
            if visibility != ThreadVisibility.PERSONAL:
                await spicedb.sync_thread_relationships(...)
        """
        # Write organization relationship
        org_success = await self.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="organization",
                subject_type="organization",
                subject_id=organization_id,
            )
        )

        # Write owner relationship (replaces creator)
        owner_success = await self.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Write space relationship (only for space-scoped threads)
        space_success = True
        if space_id:
            space_success = await self.write_relationship(
                WriteRelationshipInput(
                    resource_type="thread",
                    resource_id=thread_id,
                    relation="space",
                    subject_type="space",
                    subject_id=space_id,
                )
            )

        return org_success and owner_success and space_success

    async def remove_thread_relationships(self, thread_id: str) -> bool:
        """Remove all thread relationships.

        Call this after deleting a thread.

        Args:
            thread_id: The thread ID

        Returns:
            True if successful, False otherwise

        Example:
            await spicedb.remove_thread_relationships(thread.id)
        """
        return await self.delete_all_relationships_for_resource("thread", thread_id)

    # ========================================================================
    # Outbox Event Processing Methods
    # ========================================================================
    # These methods process events from the auth_sync_outbox table

    async def process_outbox_event(self, event_type: str, event_data: dict) -> bool:
        """Process a single outbox event and sync to SpiceDB.

        Maps outbox event types to SpiceDB relationship operations.

        Args:
            event_type: The event type (e.g., "organization_created")
            event_data: The event data from the outbox table

        Returns:
            True if successfully synced, False otherwise
        """
        # Event type to handler mapping
        handlers = {
            "organization_created": self._handle_organization_created,
            "organization_deleted": self._handle_organization_deleted,
            "organization_member_added": self._handle_organization_member_added,
            "organization_member_removed": self._handle_organization_member_removed,
            "organization_member_role_changed": self._handle_organization_member_role_changed,
            "space_created": self._handle_space_created,
            "space_deleted": self._handle_space_deleted,
            "space_member_added": self._handle_space_member_added,
            "space_member_removed": self._handle_space_member_removed,
            "document_created": self._handle_document_created,
            "document_deleted": self._handle_document_deleted,
            "thread_created": self._handle_thread_created,
            "thread_deleted": self._handle_thread_deleted,
        }

        try:
            handler = handlers.get(event_type)
            if not handler:
                logger.warning(f"Unknown event type: {event_type}")
                return False

            return await handler(event_data)

        except Exception as e:
            logger.exception(f"Failed to process outbox event {event_type}: {e}")
            return False

    # Event handlers
    async def _handle_organization_created(self, data: dict) -> bool:
        """Handle organization_created event."""
        return await self.sync_organization_owner(
            organization_id=str(data["organization_id"]),
            owner_id=str(data["owner_id"]),
        )

    async def _handle_organization_deleted(self, data: dict) -> bool:
        """Handle organization_deleted event."""
        return await self.delete_all_relationships_for_resource(
            resource_type="organization",
            resource_id=str(data["organization_id"]),
        )

    async def _handle_organization_member_added(self, data: dict) -> bool:
        """Handle organization_member_added event."""
        return await self.sync_organization_member(
            organization_id=str(data["organization_id"]),
            user_id=str(data["user_id"]),
            role=str(data["role"]),
        )

    async def _handle_organization_member_removed(self, data: dict) -> bool:
        """Handle organization_member_removed event."""
        return await self.remove_organization_member(
            organization_id=str(data["organization_id"]),
            user_id=str(data["user_id"]),
            role=str(data["role"]),
        )

    async def _handle_organization_member_role_changed(self, data: dict) -> bool:
        """Handle organization_member_role_changed event."""
        # Remove old role
        remove_success = await self.remove_organization_member(
            organization_id=str(data["organization_id"]),
            user_id=str(data["user_id"]),
            role=str(data["old_role"]),
        )

        # Add new role
        add_success = await self.sync_organization_member(
            organization_id=str(data["organization_id"]),
            user_id=str(data["user_id"]),
            role=str(data["new_role"]),
        )

        return remove_success and add_success

    async def _handle_space_created(self, data: dict) -> bool:
        """Handle space_created event."""
        return await self.sync_space_relationships(
            space_id=str(data["space_id"]),
            organization_id=str(data["organization_id"]),
            owner_id=str(data["owner_id"]),
        )

    async def _handle_space_deleted(self, data: dict) -> bool:
        """Handle space_deleted event."""
        return await self.delete_all_relationships_for_resource(
            resource_type="space",
            resource_id=str(data["space_id"]),
        )

    async def _handle_space_member_added(self, data: dict) -> bool:
        """Handle space_member_added event."""
        return await self.sync_space_member(
            space_id=str(data["space_id"]),
            user_id=str(data["user_id"]),
            role=str(data["role"]),
        )

    async def _handle_space_member_removed(self, data: dict) -> bool:
        """Handle space_member_removed event."""
        return await self.remove_space_member(
            space_id=str(data["space_id"]),
            user_id=str(data["user_id"]),
            role=str(data["role"]),
        )

    async def _handle_document_created(self, data: dict) -> bool:
        """Handle document_created event."""
        return await self.sync_document_relationships(
            document_id=str(data["document_id"]),
            space_id=str(data["space_id"]),
            uploader_id=str(data["uploaded_by"]),
        )

    async def _handle_document_deleted(self, data: dict) -> bool:
        """Handle document_deleted event."""
        return await self.delete_all_relationships_for_resource(
            resource_type="document",
            resource_id=str(data["document_id"]),
        )

    async def _handle_thread_created(self, data: dict) -> bool:
        """Handle thread_created event."""
        return await self.sync_thread_relationships(
            thread_id=str(data["thread_id"]),
            organization_id=str(data["organization_id"]),
            owner_id=str(data["owner_id"]),
            space_id=str(data["space_id"]) if data.get("space_id") else None,
        )

    async def _handle_thread_deleted(self, data: dict) -> bool:
        """Handle thread_deleted event."""
        return await self.delete_all_relationships_for_resource(
            resource_type="thread",
            resource_id=str(data["thread_id"]),
        )


# Global singleton instance
_spicedb_service: SpiceDBService | None = None


def get_spicedb_service() -> SpiceDBService:
    """Get the global SpiceDB service instance."""
    global _spicedb_service  # noqa: PLW0603
    if _spicedb_service is None:
        _spicedb_service = SpiceDBService()
    return _spicedb_service
