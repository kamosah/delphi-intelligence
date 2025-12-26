"""Integration tests for SpiceDB authorization service.

Following TESTING.md principles:
- Tests real SpiceDB operations (not mocks)
- Uses Docker Compose SpiceDB instance
- Verifies actual permission resolution logic

Note: Requires SpiceDB service running via Docker Compose.
Future enhancement: In-memory SpiceDB with subprocess (see LOG-246 plan).
"""

import time
from uuid import uuid4

import pytest

from app.schemas.spicedb import (
    CheckPermissionInput,
    DeleteRelationshipInput,
    WriteRelationshipInput,
)
from app.services.spicedb_service import SpiceDBService


@pytest.mark.asyncio()
class TestSpiceDBServiceIntegration:
    """Integration tests using real SpiceDB with Docker Compose.

    Follows apps/api/TESTING.md principles:
    - Tests real SpiceDB operations (not mocks)
    - Verifies actual permission resolution logic
    - AAA pattern (Arrange-Act-Assert)
    """

    async def test_write_and_check_organization_owner_permission(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test writing organization owner relationship and checking permissions.

        AAA Pattern (from TESTING.md):
        - Arrange: Create relationships in SpiceDB
        - Act: Check permissions
        - Assert: Verify permission resolution is correct
        """
        user_id = str(uuid4())
        org_id = str(uuid4())

        # Arrange: Write relationship - user is owner of organization
        success = await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="owner",
                subject_type="user",
                subject_id=user_id,
            )
        )
        assert success is True

        # Act & Assert: Check permission - owner can manage_settings
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="manage_settings",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        assert has_permission is True

        # Act & Assert: Check permission - owner can view
        has_view = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="view",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        assert has_view is True

    async def test_check_permission_denied_without_relationship(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test that permission is denied when no relationship exists."""
        user_id = str(uuid4())
        org_id = str(uuid4())

        # Act: No relationship written - should deny
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="manage_settings",
                resource_type="organization",
                resource_id=org_id,
            )
        )

        # Assert
        assert has_permission is False

    async def test_hierarchical_permissions_organization_to_space(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test that org admins can manage spaces via relationship inheritance."""
        user_id = str(uuid4())
        org_id = str(uuid4())
        space_id = str(uuid4())

        # Arrange: user is admin of organization
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="admin",
                subject_type="user",
                subject_id=user_id,
            )
        )

        # Arrange: space belongs to organization
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Act: Check if org admin can manage space (via inheritance)
        can_manage = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="manage_members",
                resource_type="space",
                resource_id=space_id,
            )
        )

        # Assert
        assert can_manage is True

    async def test_delete_relationship_removes_permission(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test that deleting relationship removes permissions."""
        user_id = str(uuid4())
        org_id = str(uuid4())

        # Arrange: Write relationship
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )

        # Arrange: Verify permission exists
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="view",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        assert has_permission is True

        # Act: Delete relationship
        success = await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )
        assert success is True

        # Assert: Verify permission removed
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="view",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        assert has_permission is False

    async def test_relationship_with_expiration(self, spicedb_service: SpiceDBService) -> None:
        """Test writing relationship with expiration timestamp."""
        user_id = str(uuid4())
        org_id = str(uuid4())

        # Arrange: Write relationship with 1-hour expiration
        expiration = int(time.time()) + 3600
        success = await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
                expiration=expiration,
            )
        )
        assert success is True

        # Act: Verify permission exists (not expired yet)
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="view",
                resource_type="organization",
                resource_id=org_id,
            )
        )

        # Assert
        assert has_permission is True

    async def test_multiple_roles_on_same_organization(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test user with multiple roles on same organization."""
        user_id = str(uuid4())
        org_id = str(uuid4())

        # Arrange: User has both member and admin roles
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="admin",
                subject_type="user",
                subject_id=user_id,
            )
        )

        # Act: Check both permissions work
        can_view = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="view",
                resource_type="organization",
                resource_id=org_id,
            )
        )
        can_manage = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="manage_settings",
                resource_type="organization",
                resource_id=org_id,
            )
        )

        # Assert
        assert can_view is True
        assert can_manage is True


@pytest.mark.asyncio()
class TestSpiceDBServiceErrorHandling:
    """Test error handling and edge cases."""

    async def test_check_permission_with_invalid_resource_type(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test graceful error handling for invalid resource types."""
        # Act: Should fail closed (deny access) on invalid resource type
        result = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=str(uuid4()),
                permission="read",
                resource_type="invalid_type",
                resource_id=str(uuid4()),
            )
        )

        # Assert
        assert result is False

    async def test_write_relationship_with_empty_ids(self, spicedb_service: SpiceDBService) -> None:
        """Test error handling for empty IDs."""
        # Act: Should return False on invalid input
        result = await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id="",
                relation="member",
                subject_type="user",
                subject_id=str(uuid4()),
            )
        )

        # Assert
        assert result is False
