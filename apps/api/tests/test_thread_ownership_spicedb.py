"""Integration tests for thread ownership SpiceDB relationships and permissions.

Tests the thread ownership model implemented in LOG-254 and LOG-255:
- Owner-based access control
- Visibility scoping (personal, space, organization)
- Split read permissions (read vs read_org)
- Message authorship permissions

Following TESTING.md principles:
- Tests real SpiceDB operations (not mocks)
- Uses test_resource_ids for parallel-safe execution
- AAA pattern (Arrange-Act-Assert)
- Automatic cleanup via spicedb_service fixture
"""

import pytest

from app.schemas.spicedb import CheckPermissionInput, WriteRelationshipInput
from app.services.spicedb_service import SpiceDBService


@pytest.mark.asyncio
class TestThreadOwnerPermissions:
    """Test permissions for thread owners."""

    async def test_thread_owner_has_read_permission(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that thread owner can read their thread."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("user")
        thread_id = test_resource_ids("thread")

        # Arrange: Write owner relationship
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Act & Assert: Check permission
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is True
        # Note: Cleanup happens automatically via spicedb_service fixture

    async def test_thread_owner_has_update_permission(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that thread owner can update their thread."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("user")
        thread_id = test_resource_ids("thread")

        # Arrange: Write owner relationship
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Act & Assert: Check permission
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is True

    async def test_thread_owner_has_delete_permission(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that thread owner can delete their thread."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("user")
        thread_id = test_resource_ids("thread")

        # Arrange: Write owner relationship
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Act & Assert: Check permission
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is True


@pytest.mark.asyncio
class TestPersonalThreadAccess:
    """Test access control for personal threads (no space or org)."""

    async def test_non_owner_cannot_read_personal_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that non-owners cannot read personal threads."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        other_user_id = test_resource_ids("other_user")
        thread_id = test_resource_ids("thread")

        # Arrange: Write owner relationship
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Act & Assert: Check permission for non-owner
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=other_user_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is False

    async def test_non_owner_cannot_update_personal_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that non-owners cannot update personal threads."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        other_user_id = test_resource_ids("other_user")
        thread_id = test_resource_ids("thread")

        # Arrange: Write owner relationship
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Act & Assert: Check permission for non-owner
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=other_user_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is False


@pytest.mark.asyncio
class TestSpaceThreadAccess:
    """Test access control for space-scoped threads."""

    async def test_space_member_can_read_space_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that space members can read space-scoped threads."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        space_member_id = test_resource_ids("space_member")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup space membership (viewer role)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=space_member_id,
            )
        )

        # Arrange: Setup organization relationship for space
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Setup thread relationships
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )

        # Act & Assert: Check permission for space member (should use 'read' permission)
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is True

    async def test_non_space_member_cannot_read_space_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that non-space members cannot read space threads."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        other_user_id = test_resource_ids("other_user")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")

        # Arrange: Setup thread with space relationship (no space membership)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )

        # Act & Assert: Check permission for non-space member
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=other_user_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is False


@pytest.mark.asyncio
class TestOrganizationThreadAccess:
    """Test access control for org-wide threads."""

    async def test_org_member_can_read_org_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that org members can read org-wide threads using read_org permission."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        org_member_id = test_resource_ids("org_member")
        thread_id = test_resource_ids("thread")
        org_id = test_resource_ids("org")

        # Arrange: Setup organization membership
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=org_member_id,
            )
        )

        # Arrange: Setup thread relationships (org-wide thread)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Act & Assert: Check read_org permission for org member
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=org_member_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is True

    async def test_org_member_cannot_read_space_thread_via_org(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that org members CANNOT read space threads via org membership.

        This prevents permission leaks - space threads should only be accessible
        to space members, not all org members.
        """
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        org_member_id = test_resource_ids("org_member")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup organization membership
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=org_member_id,
            )
        )

        # Arrange: Setup space membership for owner (realistic - owner must be space member to create threads)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="editor",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Arrange: Setup organization for space
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Setup thread with BOTH space and org (space-scoped, not org-wide)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Act & Assert: Check 'read' permission (space-scoped) - should fail
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=org_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is False


@pytest.mark.asyncio
class TestMessageAuthorPermissions:
    """Test permissions for message authors."""

    async def test_message_author_can_update_message(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that message author can update their message."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        author_id = test_resource_ids("author")
        thread_id = test_resource_ids("thread")
        message_id = test_resource_ids("message")

        # Arrange: Setup thread owner
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Arrange: Setup message relationships
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="thread",
                subject_type="thread",
                subject_id=thread_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="author",
                subject_type="user",
                subject_id=author_id,
            )
        )

        # Act & Assert: Check update permission for author
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=author_id,
                permission="update",
                resource_type="message",
                resource_id=message_id,
            )
        )

        assert has_permission is True

    async def test_message_author_can_delete_message(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that message author can delete their message."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        author_id = test_resource_ids("author")
        thread_id = test_resource_ids("thread")
        message_id = test_resource_ids("message")

        # Arrange: Setup thread owner
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Arrange: Setup message relationships
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="thread",
                subject_type="thread",
                subject_id=thread_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="author",
                subject_type="user",
                subject_id=author_id,
            )
        )

        # Act & Assert: Check delete permission for author
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=author_id,
                permission="delete",
                resource_type="message",
                resource_id=message_id,
            )
        )

        assert has_permission is True

    async def test_thread_owner_can_delete_any_message(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that thread owner can delete any message in their thread."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        author_id = test_resource_ids("author")
        thread_id = test_resource_ids("thread")
        message_id = test_resource_ids("message")

        # Arrange: Setup thread owner
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Arrange: Setup message from different user
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="thread",
                subject_type="thread",
                subject_id=thread_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="author",
                subject_type="user",
                subject_id=author_id,
            )
        )

        # Act & Assert: Check delete permission for thread owner
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="delete",
                resource_type="message",
                resource_id=message_id,
            )
        )

        assert has_permission is True

    async def test_message_inherits_thread_read_permission(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that message read permission inherits from thread."""
        # Generate unique IDs for this test (parallel-safe)
        owner_id = test_resource_ids("owner")
        space_member_id = test_resource_ids("space_member")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")
        message_id = test_resource_ids("message")

        # Arrange: Setup space membership
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=space_member_id,
            )
        )

        # Arrange: Setup organization for space
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Setup thread with space
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )

        # Arrange: Setup message
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="message",
                resource_id=message_id,
                relation="thread",
                subject_type="thread",
                subject_id=thread_id,
            )
        )

        # Act & Assert: Space member should be able to read message (inherits from thread->read)
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_member_id,
                permission="read",
                resource_type="message",
                resource_id=message_id,
            )
        )

        assert has_permission is True
