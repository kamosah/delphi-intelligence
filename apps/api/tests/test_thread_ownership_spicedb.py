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

from app.schemas.spicedb import (
    CheckPermissionInput,
    DeleteRelationshipInput,
    WriteRelationshipInput,
)
from app.services.spicedb_service import SpiceDBService
from tests.factories import create_organization, create_thread, create_user


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


@pytest.mark.asyncio
class TestMultiOrgUserIsolation:
    """Test cross-organization permission isolation.

    Verify that users in multiple organizations cannot leak permissions
    across organizational boundaries.
    """

    async def test_personal_thread_accessible_to_owner_regardless_of_org(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that personal threads are user-specific, not org-dependent.

        Personal threads are accessible to the owner regardless of which organization
        context they're in. This validates that ownership is user-centric, not org-centric.
        """
        # Generate unique IDs for multi-org scenario
        user_id = test_resource_ids("user")
        org_a_id = test_resource_ids("org_a")
        org_b_id = test_resource_ids("org_b")
        thread_id = test_resource_ids("thread")

        # Arrange: User is member of both Org A and Org B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_a_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_b_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )

        # Arrange: Personal thread owned by user (org-agnostic)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=user_id,
            )
        )

        # Act & Assert: Owner can access personal thread regardless of org context
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is True

    async def test_user_in_org_a_cannot_read_org_b_space_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test cross-org space thread isolation."""
        # Generate unique IDs for cross-org scenario
        user_org_a_id = test_resource_ids("user_org_a")
        user_org_b_id = test_resource_ids("user_org_b")
        org_a_id = test_resource_ids("org_a")
        org_b_id = test_resource_ids("org_b")
        space_b_id = test_resource_ids("space_b")
        thread_b_id = test_resource_ids("thread_b")

        # Arrange: User A in Org A
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_a_id,
                relation="member",
                subject_type="user",
                subject_id=user_org_a_id,
            )
        )

        # Arrange: User B in Org B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_b_id,
                relation="member",
                subject_type="user",
                subject_id=user_org_b_id,
            )
        )

        # Arrange: Space B belongs to Org B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_b_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_b_id,
            )
        )

        # Arrange: User B is viewer in Space B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_b_id,
                relation="viewer",
                subject_type="user",
                subject_id=user_org_b_id,
            )
        )

        # Arrange: Thread B owned by User B in Space B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_b_id,
                relation="owner",
                subject_type="user",
                subject_id=user_org_b_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_b_id,
                relation="space",
                subject_type="space",
                subject_id=space_b_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_b_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_b_id,
            )
        )

        # Act & Assert: User A cannot access Org B space thread
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_org_a_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_b_id,
            )
        )

        assert has_permission is False

    async def test_user_in_org_a_cannot_read_org_b_org_wide_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test cross-org org-wide thread isolation."""
        # Generate unique IDs
        user_org_a_id = test_resource_ids("user_org_a")
        user_org_b_id = test_resource_ids("user_org_b")
        org_a_id = test_resource_ids("org_a")
        org_b_id = test_resource_ids("org_b")
        thread_org_b_id = test_resource_ids("thread_org_b")

        # Arrange: User A in Org A
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_a_id,
                relation="member",
                subject_type="user",
                subject_id=user_org_a_id,
            )
        )

        # Arrange: User B in Org B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_b_id,
                relation="member",
                subject_type="user",
                subject_id=user_org_b_id,
            )
        )

        # Arrange: Org-wide thread in Org B (no space)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_org_b_id,
                relation="owner",
                subject_type="user",
                subject_id=user_org_b_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_org_b_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_b_id,
            )
        )

        # Act & Assert: User A cannot access Org B org-wide thread via read_org
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_org_a_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_org_b_id,
            )
        )

        assert has_permission is False

    async def test_user_in_both_orgs_can_access_threads_independently(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that users in multiple orgs can access threads in each org independently."""
        # Generate unique IDs
        user_id = test_resource_ids("user")
        org_a_id = test_resource_ids("org_a")
        org_b_id = test_resource_ids("org_b")
        thread_org_a_id = test_resource_ids("thread_org_a")
        thread_org_b_id = test_resource_ids("thread_org_b")
        owner_a_id = test_resource_ids("owner_a")
        owner_b_id = test_resource_ids("owner_b")

        # Arrange: User is member of both Org A and Org B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_a_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_b_id,
                relation="member",
                subject_type="user",
                subject_id=user_id,
            )
        )

        # Arrange: Org-wide thread in Org A
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_org_a_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_a_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_org_a_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_a_id,
            )
        )

        # Arrange: Org-wide thread in Org B
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_org_b_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_b_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_org_b_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_b_id,
            )
        )

        # Act & Assert: User can access BOTH org-wide threads independently
        has_permission_a = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_org_a_id,
            )
        )
        has_permission_b = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_org_b_id,
            )
        )

        assert has_permission_a is True
        assert has_permission_b is True


@pytest.mark.asyncio
class TestOwnershipTransfer:
    """Test mutable owner_user_id transfer scenarios.

    Verify that ownership can be transferred and permissions update correctly.
    """

    async def test_new_owner_has_full_permissions_after_transfer(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that new owner gains full permissions after ownership transfer."""
        # Generate unique IDs
        owner1_id = test_resource_ids("owner1")
        owner2_id = test_resource_ids("owner2")
        thread_id = test_resource_ids("thread")

        # Arrange: Initial owner is Owner1
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner1_id,
            )
        )

        # Arrange: Transfer ownership to Owner2 (delete Owner1, write Owner2)
        await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner1_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner2_id,
            )
        )

        # Act & Assert: Owner2 has full permissions (read/update/delete)
        has_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner2_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        has_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner2_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        has_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner2_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_read is True
        assert has_update is True
        assert has_delete is True

        # Act & Assert: Owner1 loses owner permissions
        has_update_old_owner = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner1_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_update_old_owner is False

    async def test_original_owner_loses_write_permissions_after_transfer(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that original owner retains read (space member) but loses write after transfer."""
        # Generate unique IDs
        owner1_id = test_resource_ids("owner1")
        owner2_id = test_resource_ids("owner2")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup space with Owner1 as viewer
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=owner1_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread owned by Owner1
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner1_id,
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

        # Arrange: Transfer ownership to Owner2
        await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner1_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner2_id,
            )
        )

        # Act & Assert: Owner1 can still read (space member via space->read)
        has_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner1_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_read is True

        # Act & Assert: Owner1 cannot update (not owner anymore)
        has_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner1_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_update is False

    async def test_created_by_remains_immutable_after_ownership_transfer(
        self, spicedb_service: SpiceDBService, db_session, test_resource_ids
    ):
        """Test that created_by field remains immutable after ownership transfer.

        This test uses database integration to verify the immutability of created_by.
        """
        # Arrange: Create real database records
        owner1 = await create_user(db_session, email="owner1@test.com")
        owner2 = await create_user(db_session, email="owner2@test.com")
        org = await create_organization(db_session, "Test Org", owner_id=owner1.id)
        await db_session.commit()

        # Arrange: Create thread with owner1 as creator
        thread = await create_thread(
            db_session,
            query_text="Test thread",
            organization=org,
            creator=owner1,  # Sets created_by = owner1.id
        )
        await db_session.commit()

        # Verify initial state
        assert thread.owner_user_id == owner1.id
        assert thread.created_by == owner1.id

        # Arrange: Simulate ownership transfer in database
        thread.owner_user_id = owner2.id
        await db_session.commit()

        # Act: Refresh to verify database state persisted
        await db_session.refresh(thread)

        # Assert: created_by remains immutable (still owner1)
        assert thread.owner_user_id == owner2.id  # Changed
        assert thread.created_by == owner1.id  # Immutable


@pytest.mark.asyncio
class TestSpaceRoleHierarchy:
    """Test space viewer/editor/owner role-based permissions.

    Verify that space roles have different permission levels for threads.
    """

    async def test_space_viewer_can_read_space_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that space viewer can read but cannot update/delete thread."""
        # Generate unique IDs
        owner_id = test_resource_ids("owner")
        viewer_id = test_resource_ids("viewer")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup space with viewer role
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=viewer_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread owned by different user
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

        # Act & Assert: Viewer can read
        has_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=viewer_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_read is True

        # Act & Assert: Viewer cannot update
        has_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=viewer_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_update is False

        # Act & Assert: Viewer cannot delete
        has_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=viewer_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_delete is False

    async def test_space_editor_can_read_but_not_update_thread(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that space editor can read but cannot update thread (owner-only write)."""
        # Generate unique IDs
        owner_id = test_resource_ids("owner")
        editor_id = test_resource_ids("editor")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup space with editor role
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="editor",
                subject_type="user",
                subject_id=editor_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread owned by different user
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

        # Act & Assert: Editor can read (via space->read)
        has_read = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=editor_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_read is True

        # Act & Assert: Editor cannot update (owner-only)
        has_update = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=editor_id,
                permission="update",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_update is False

    async def test_space_owner_can_manage_all_threads_in_space(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that space owner can delete threads via space->manage_members permission."""
        # Generate unique IDs
        thread_owner_id = test_resource_ids("thread_owner")
        space_owner_id = test_resource_ids("space_owner")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup space with space owner role
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="owner",
                subject_type="user",
                subject_id=space_owner_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Thread owned by different user in the space
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=thread_owner_id,
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

        # Act & Assert: Space owner can delete (via space->manage_members)
        # SpiceDB schema: permission delete = owner + space->manage_members + organization->admin
        has_delete = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_owner_id,
                permission="delete",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_delete is True


@pytest.mark.asyncio
class TestEdgeCaseScenarios:
    """Test edge cases (deletions, null values, orphaned threads).

    Verify that permission model handles deletion scenarios correctly.
    """

    async def test_thread_access_after_user_deletion(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that owner loses access after user deletion (SET NULL)."""
        # Generate unique IDs
        owner_id = test_resource_ids("owner")
        thread_id = test_resource_ids("thread")

        # Arrange: Thread with owner
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Verify initial state
        has_permission_before = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert has_permission_before is True

        # Act: Simulate user deletion (delete owner relationship)
        await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Assert: Owner loses all access permissions
        has_permission_after = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission_after is False

    async def test_space_thread_permissions_after_space_deletion(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that space members lose access after space deletion, owner retains."""
        # Generate unique IDs
        owner_id = test_resource_ids("owner")
        space_member_id = test_resource_ids("space_member")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Setup space and membership
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=space_member_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread
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

        # Verify initial state
        space_member_has_access_before = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert space_member_has_access_before is True

        # Act: Simulate space deletion (delete space relationship)
        await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )

        # Assert: Space member loses access
        space_member_has_access_after = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert space_member_has_access_after is False

        # Assert: Owner still has access (direct owner relationship)
        owner_has_access = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert owner_has_access is True

    async def test_org_thread_permissions_after_org_deletion(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that org members lose read_org after org deletion, owner retains access."""
        # Generate unique IDs
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

        # Arrange: Org-wide thread
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

        # Verify initial state
        org_member_has_access_before = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=org_member_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert org_member_has_access_before is True

        # Act: Simulate org deletion (delete org relationship)
        await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Assert: Org member loses read_org access
        org_member_has_access_after = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=org_member_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert org_member_has_access_after is False

        # Assert: Owner still has access via direct owner relationship
        owner_has_access = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=owner_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert owner_has_access is True

    async def test_concurrent_space_and_org_membership_access(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that user accesses via space->read, not read_org bypass for space threads."""
        # Generate unique IDs
        user_id = test_resource_ids("user")
        owner_id = test_resource_ids("owner")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: User is both space member AND org member
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
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=user_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread (not org-wide)
        # Note: Space threads should ONLY have space relationship (no org relationship)
        # This prevents org members from bypassing space restrictions via read_org
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

        # Act & Assert: User can access via space->read (correct permission)
        has_read_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert has_read_permission is True

        # Act & Assert: User CANNOT access via read_org (space thread, not org-wide)
        # This prevents org membership from bypassing space restrictions
        has_read_org_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=user_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert has_read_org_permission is False


@pytest.mark.asyncio
class TestAdminBypassPrevention:
    """Test that org admins cannot bypass space restrictions.

    Verify critical security feature: org admins don't auto-access space threads.
    """

    async def test_org_admin_cannot_read_space_thread_without_membership(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that org admin cannot read space thread without space membership.

        SpiceDB schema: permission read = owner + space->read (no organization->admin)
        This prevents org admins from bypassing space-level access controls.
        """
        # Generate unique IDs
        admin_id = test_resource_ids("admin")
        thread_owner_id = test_resource_ids("thread_owner")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Admin is org admin (NOT space member)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="admin",
                subject_type="user",
                subject_id=admin_id,
            )
        )

        # Arrange: Space belongs to org
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread owned by different user
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=thread_owner_id,
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

        # Act & Assert: Admin cannot read space thread (no admin bypass)
        has_permission = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=admin_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission is False

    async def test_org_admin_can_access_after_added_to_space(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that org admin gains access ONLY after explicit space membership."""
        # Generate unique IDs
        admin_id = test_resource_ids("admin")
        thread_owner_id = test_resource_ids("thread_owner")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Admin is org admin
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="admin",
                subject_type="user",
                subject_id=admin_id,
            )
        )

        # Arrange: Space thread
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=thread_owner_id,
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

        # Verify initial state: Admin cannot access
        has_permission_before = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=admin_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert has_permission_before is False

        # Act: Add admin as space viewer (explicit membership)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=admin_id,
            )
        )

        # Assert: Admin can now read (via space->read)
        has_permission_after = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=admin_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission_after is True


@pytest.mark.asyncio
class TestVisibilityTransitions:
    """Test permission changes during visibility transitions.

    Verify that changing thread visibility (PERSONAL→SPACE→ORG) updates permissions correctly.
    """

    async def test_personal_to_space_visibility_grants_access_to_space_members(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that transitioning from PERSONAL to SPACE grants access to space members."""
        # Generate unique IDs
        owner_id = test_resource_ids("owner")
        space_member_id = test_resource_ids("space_member")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

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
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Personal thread (owner only)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="owner",
                subject_type="user",
                subject_id=owner_id,
            )
        )

        # Verify initial state: Space member cannot access personal thread
        has_permission_before = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert has_permission_before is False

        # Act: Transition to space visibility (add space relationship)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )

        # Assert: Space member gains access after transition
        has_permission_after = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )

        assert has_permission_after is True

    async def test_space_to_org_visibility_grants_access_to_org_members(
        self, spicedb_service: SpiceDBService, test_resource_ids
    ):
        """Test that transitioning from SPACE to ORG grants access to org members."""
        # Generate unique IDs
        owner_id = test_resource_ids("owner")
        space_only_member_id = test_resource_ids("space_only_member")
        org_member_no_space_id = test_resource_ids("org_member_no_space")
        thread_id = test_resource_ids("thread")
        space_id = test_resource_ids("space")
        org_id = test_resource_ids("org")

        # Arrange: Space member (NOT in org)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="viewer",
                subject_type="user",
                subject_id=space_only_member_id,
            )
        )

        # Arrange: Org member (NOT in space)
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="organization",
                resource_id=org_id,
                relation="member",
                subject_type="user",
                subject_id=org_member_no_space_id,
            )
        )

        # Arrange: Space relationship for space
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="space",
                resource_id=space_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Arrange: Space thread (before transition) - NO organization relationship initially
        # Space threads should only have space relationship to prevent read_org leaks
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

        # Verify initial state: Org member (not in space) cannot access via read_org
        org_member_has_access_before = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=org_member_no_space_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert org_member_has_access_before is False

        # Act: Transition to org-wide (delete space, add organization)
        await spicedb_service.delete_relationship(
            DeleteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="space",
                subject_type="space",
                subject_id=space_id,
            )
        )
        # Add organization relationship to grant read_org access
        await spicedb_service.write_relationship(
            WriteRelationshipInput(
                resource_type="thread",
                resource_id=thread_id,
                relation="organization",
                subject_type="organization",
                subject_id=org_id,
            )
        )

        # Assert: Org members gain access via read_org
        org_member_has_access_after = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=org_member_no_space_id,
                permission="read_org",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert org_member_has_access_after is True

        # Assert: Space-only members lose access (no longer space->read path)
        space_only_has_access = await spicedb_service.check_permission(
            CheckPermissionInput(
                user_id=space_only_member_id,
                permission="read",
                resource_type="thread",
                resource_id=thread_id,
            )
        )
        assert space_only_has_access is False
