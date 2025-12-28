"""Integration tests for SpiceDB permissions - verifies real SpiceDB service integration.

These tests verify that the SpiceDB service correctly enforces permissions
across organization, space, and thread resources. Unlike unit tests, these
use the real SpiceDB service (not mocks) to ensure authorization works end-to-end.

Uses the spicedb_service fixture for auto-cleanup with parallel-safe test execution.
"""

from collections.abc import Callable

import pytest

from app.schemas.spicedb import CheckPermissionInput
from app.services.spicedb_service import SpiceDBService


class TestSpiceDBPermissionsIntegration:
    """Test SpiceDB permission enforcement with real service."""

    @pytest.mark.asyncio
    async def test_organization_owner_has_all_permissions(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that organization owner has all organization permissions."""
        # Arrange
        org_id = test_resource_ids("org")
        owner_id = test_resource_ids("owner")

        # Sync owner relationship
        await spicedb_service.sync_organization_owner(org_id, owner_id)

        # Act & Assert: Owner should have all permissions
        permissions_to_test = [
            "manage_settings",
            "invite_member",
            "remove_member",
            "delete",
        ]

        for permission in permissions_to_test:
            has_permission = await spicedb_service.check_permission(
                CheckPermissionInput(
                    user_id=owner_id,
                    permission=permission,
                    resource_type="organization",
                    resource_id=org_id,
                )
            )
            assert has_permission is True, f"Owner should have {permission} permission"

        # Cleanup handled automatically by spicedb_service fixture

    @pytest.mark.asyncio
    async def test_organization_admin_has_limited_permissions(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that organization admin has admin permissions but not owner-only."""
        # Arrange
        org_id = test_resource_ids("org")
        owner_id = test_resource_ids("owner")
        admin_id = test_resource_ids("admin")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, owner_id)
        await spicedb_service.sync_organization_member(org_id, admin_id, "admin")

        # Act & Assert: Admin should have some permissions
        admin_permissions = ["manage_settings", "invite_member", "remove_member"]
        for permission in admin_permissions:
            has_permission = await spicedb_service.check_permission(
                CheckPermissionInput(
                    user_id=admin_id,
                    permission=permission,
                    resource_type="organization",
                    resource_id=org_id,
                )
            )
            assert has_permission is True, f"Admin should have {permission} permission"

        # Admin should NOT have owner-only permissions
        owner_only_permissions = ["delete"]
        for permission in owner_only_permissions:
            has_permission = await spicedb_service.check_permission(
                CheckPermissionInput(
                    user_id=admin_id,
                    permission=permission,
                    resource_type="organization",
                    resource_id=org_id,
                )
            )
            assert has_permission is False, f"Admin should NOT have {permission} permission"

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_space_owner_can_update_and_delete(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that space owner can update and delete space."""
        # Arrange
        org_id = test_resource_ids("org")
        space_id = test_resource_ids("space")
        owner_id = test_resource_ids("owner")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, owner_id)
        await spicedb_service.sync_space_relationships(space_id, org_id, owner_id)

        # Act & Assert
        permissions_to_test = ["update", "delete", "read"]
        for permission in permissions_to_test:
            has_permission = await spicedb_service.check_permission(
                CheckPermissionInput(
                    user_id=owner_id,
                    permission=permission,
                    resource_type="space",
                    resource_id=space_id,
                )
            )
            assert has_permission is True, f"Owner should have {permission} permission"

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_space_editor_can_update_not_delete(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that space editor can update but not delete space."""
        # Arrange
        org_id = test_resource_ids("org")
        space_id = test_resource_ids("space")
        owner_id = test_resource_ids("owner")
        editor_id = test_resource_ids("editor")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, owner_id)
        await spicedb_service.sync_space_relationships(space_id, org_id, owner_id)
        await spicedb_service.sync_space_member(space_id, editor_id, "editor")

        # Act & Assert: Editor can update and read
        can_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=editor_id,
                permission="update",
                resource_type="space",
                resource_id=space_id,
            )
        )
        assert can_update is True

        can_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=editor_id,
                permission="read",
                resource_type="space",
                resource_id=space_id,
            )
        )
        assert can_read is True

        # Editor cannot delete
        can_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=editor_id,
                permission="delete",
                resource_type="space",
                resource_id=space_id,
            )
        )
        assert can_delete is False

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_thread_creator_can_update_and_delete(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that thread creator can update and delete their thread."""
        # Arrange
        org_id = test_resource_ids("org")
        space_id = test_resource_ids("space")
        thread_id = test_resource_ids("thread")
        creator_id = test_resource_ids("creator")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, creator_id)
        await spicedb_service.sync_space_relationships(space_id, org_id, creator_id)
        await spicedb_service.sync_thread_relationships(thread_id, org_id, creator_id, space_id)

        # Act & Assert
        permissions_to_test = ["update", "delete", "read"]
        for permission in permissions_to_test:
            has_permission = await spicedb_service.check_permission(
                CheckPermissionInput(
                    user_id=creator_id,
                    permission=permission,
                    resource_type="thread",
                    resource_id=thread_id,
                )
            )
            assert has_permission is True, f"Creator should have {permission} permission"

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_thread_non_creator_cannot_update(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that non-creator cannot update thread (unless admin)."""
        # Arrange
        org_id = test_resource_ids("org")
        space_id = test_resource_ids("space")
        thread_id = test_resource_ids("thread")
        creator_id = test_resource_ids("creator")
        viewer_id = test_resource_ids("viewer")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, creator_id)
        await spicedb_service.sync_space_relationships(space_id, org_id, creator_id)
        await spicedb_service.sync_thread_relationships(thread_id, org_id, creator_id, space_id)
        await spicedb_service.sync_space_member(space_id, viewer_id, "viewer")

        # Act & Assert: Viewer can read but not update/delete
        can_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=viewer_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert can_read is True

        can_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=viewer_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert can_update is False

        can_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=viewer_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert can_delete is False

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_org_admin_can_override_thread_permissions(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that org admin can update/delete any thread in their org."""
        # Arrange
        org_id = test_resource_ids("org")
        space_id = test_resource_ids("space")
        thread_id = test_resource_ids("thread")
        creator_id = test_resource_ids("creator")
        admin_id = test_resource_ids("admin")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, creator_id)
        await spicedb_service.sync_organization_member(org_id, admin_id, "admin")
        await spicedb_service.sync_space_relationships(space_id, org_id, creator_id)
        await spicedb_service.sync_thread_relationships(thread_id, org_id, creator_id, space_id)

        # Act & Assert: Org admin can update and delete even though not creator
        can_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=admin_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert can_update is True

        can_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=admin_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert can_delete is True

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_cross_tenant_isolation(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test that users from different orgs cannot access each other's resources."""
        # Arrange: Two separate organizations
        org1_id = test_resource_ids("org1")
        org2_id = test_resource_ids("org2")
        user1_id = test_resource_ids("user1")
        user2_id = test_resource_ids("user2")
        space1_id = test_resource_ids("space1")

        # Sync org1 with user1
        await spicedb_service.sync_organization_owner(org1_id, user1_id)
        await spicedb_service.sync_space_relationships(space1_id, org1_id, user1_id)

        # Sync org2 with user2
        await spicedb_service.sync_organization_owner(org2_id, user2_id)

        # Act & Assert: User2 (from org2) should NOT have access to org1's space
        can_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user2_id,
                permission="read",
                resource_type="space",
                resource_id=space1_id,
            )
        )
        assert can_read is False, "User from different org should not have access"

        can_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user2_id,
                permission="update",
                resource_type="space",
                resource_id=space1_id,
            )
        )
        assert can_update is False, "User from different org should not have access"

        # Cleanup handled automatically

    @pytest.mark.asyncio
    async def test_org_wide_thread_permissions(
        self, spicedb_service: SpiceDBService, test_resource_ids: Callable[[str], str]
    ):
        """Test permissions for org-wide threads (no space)."""
        # Arrange
        org_id = test_resource_ids("org")
        thread_id = test_resource_ids("thread")
        creator_id = test_resource_ids("creator")
        admin_id = test_resource_ids("admin")
        member_id = test_resource_ids("member")

        # Sync relationships
        await spicedb_service.sync_organization_owner(org_id, creator_id)
        await spicedb_service.sync_organization_member(org_id, admin_id, "admin")
        await spicedb_service.sync_organization_member(org_id, member_id, "member")
        await spicedb_service.sync_thread_relationships(
            thread_id, org_id, creator_id, None
        )  # No space

        # Act & Assert: Creator can update/delete
        creator_can_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=creator_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert creator_can_delete is True

        # Org admin can update/delete
        admin_can_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=admin_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert admin_can_delete is True

        # Regular member can view but not delete
        member_can_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert member_can_read is True

        member_can_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=member_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert member_can_delete is False

        # Cleanup handled automatically
