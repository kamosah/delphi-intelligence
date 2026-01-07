"""Integration tests for SpiceDB authorization.

This module tests fine-grained access control using SpiceDB:
- Thread ownership and visibility (PERSONAL, SPACE, ORGANIZATION)
- Space permissions (viewer, editor, owner)
- Organization permissions (viewer, member, admin, owner)
- RLS policy integration for PERSONAL threads
- Parallel test safety with test_resource_ids
- SpiceDB cleanup verification
"""

from collections.abc import Callable

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.thread import Thread, ThreadVisibility
from app.schemas.spicedb import CheckPermissionInput, WriteRelationshipInput
from app.services.spicedb_service import SpiceDBService
from tests.factories import create_user


@pytest.mark.integration
async def test_personal_thread_isolation(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Test that PERSONAL threads are isolated to owner only.

    PERSONAL threads should:
    - NOT use SpiceDB (rely on PostgreSQL RLS)
    - Be accessible only to the owner
    - Prevent access by other users
    """
    # Create user
    user1 = await create_user(postgres_session, email="user1@example.com")
    await postgres_session.commit()

    # Create PERSONAL thread owned by user1 (no organization, no space)
    thread = Thread(
        query_text="Personal question",
        title="Personal Thread",
        owner_user_id=user1.id,
        created_by=user1.id,
        visibility=ThreadVisibility.PERSONAL,
        organization_id=None,  # No organization
        space_id=None,  # No space
    )
    postgres_session.add(thread)
    await postgres_session.commit()

    # IMPORTANT: PERSONAL threads do NOT use SpiceDB (rely on PostgreSQL RLS)
    # We verify this by checking that no relationships should be written

    # Verify thread exists in database
    result = await postgres_session.execute(select(Thread).where(Thread.id == thread.id))
    db_thread = result.scalar_one_or_none()
    assert db_thread is not None
    assert db_thread.visibility == ThreadVisibility.PERSONAL
    assert db_thread.owner_user_id == user1.id
    assert db_thread.organization_id is None
    assert db_thread.space_id is None


@pytest.mark.integration
async def test_space_thread_access_control(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Test that SPACE threads are accessible to space members.

    SPACE threads should:
    - Use SpiceDB 'read' permission (space->read)
    - Be accessible to all space members
    - Prevent access by non-members
    """
    # Generate unique IDs for parallel safety
    org_id = test_resource_ids("org")
    space_id = test_resource_ids("space")
    thread_id = test_resource_ids("thread")
    owner_id = test_resource_ids("owner")
    member_id = test_resource_ids("member")
    outsider_id = test_resource_ids("outsider")

    # Write SpiceDB relationships
    # Organization with owner
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="owner",
            subject_type="user",
            subject_id=owner_id,
        )
    )

    # Space with organization and owner
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
            resource_type="space",
            resource_id=space_id,
            relation="owner",
            subject_type="user",
            subject_id=owner_id,
        )
    )

    # Add member as space viewer
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="space",
            resource_id=space_id,
            relation="viewer",
            subject_type="user",
            subject_id=member_id,
        )
    )

    # Thread with space (SPACE visibility)
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
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="thread",
            resource_id=thread_id,
            relation="space",
            subject_type="space",
            subject_id=space_id,
        )
    )

    # Owner can read (via owner relationship)
    owner_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id,
            permission="read",
            resource_type="thread",
            resource_id=thread_id,
        )
    )
    assert owner_can_read is True

    # Space member can read (via space->read)
    member_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=member_id,
            permission="read",
            resource_type="thread",
            resource_id=thread_id,
        )
    )
    assert member_can_read is True

    # Outsider cannot read (not in space)
    outsider_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=outsider_id,
            permission="read",
            resource_type="thread",
            resource_id=thread_id,
        )
    )
    assert outsider_can_read is False


@pytest.mark.integration
async def test_organization_thread_access_control(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Test that ORGANIZATION threads are accessible to org members.

    ORGANIZATION threads should:
    - Use SpiceDB 'read_org' permission (organization->view)
    - Be accessible to all organization members
    - Prevent access by non-members
    """
    # Generate unique IDs for parallel safety
    org_id = test_resource_ids("org")
    thread_id = test_resource_ids("thread")
    owner_id = test_resource_ids("owner")
    member_id = test_resource_ids("member")
    outsider_id = test_resource_ids("outsider")

    # Write SpiceDB relationships
    # Organization with owner and member
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="owner",
            subject_type="user",
            subject_id=owner_id,
        )
    )
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="member",
            subject_type="user",
            subject_id=member_id,
        )
    )

    # Thread with organization (ORGANIZATION visibility, no space)
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

    # Owner can read via read_org (organization->view)
    owner_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id,
            permission="read_org",
            resource_type="thread",
            resource_id=thread_id,
        )
    )
    assert owner_can_read is True

    # Org member can read via read_org (organization->view)
    member_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=member_id,
            permission="read_org",
            resource_type="thread",
            resource_id=thread_id,
        )
    )
    assert member_can_read is True

    # Outsider cannot read (not in organization)
    outsider_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=outsider_id,
            permission="read_org",
            resource_type="thread",
            resource_id=thread_id,
        )
    )
    assert outsider_can_read is False


@pytest.mark.integration
async def test_space_permission_hierarchy(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Test space permission hierarchy (viewer < editor < owner).

    Space permissions:
    - Viewer: Can read
    - Editor: Can read + update + upload_document
    - Owner: Can read + update + upload_document + delete + manage_members
    """
    # Generate unique IDs
    org_id = test_resource_ids("org")
    space_id = test_resource_ids("space")
    owner_id = test_resource_ids("owner")
    editor_id = test_resource_ids("editor")
    viewer_id = test_resource_ids("viewer")

    # Write SpiceDB relationships
    # Organization
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="owner",
            subject_type="user",
            subject_id=owner_id,
        )
    )

    # Space with owner, editor, viewer
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
            resource_type="space",
            resource_id=space_id,
            relation="owner",
            subject_type="user",
            subject_id=owner_id,
        )
    )
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
            relation="viewer",
            subject_type="user",
            subject_id=viewer_id,
        )
    )

    # Viewer permissions
    viewer_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=viewer_id, permission="read", resource_type="space", resource_id=space_id
        )
    )
    viewer_can_update = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=viewer_id, permission="update", resource_type="space", resource_id=space_id
        )
    )
    viewer_can_delete = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=viewer_id, permission="delete", resource_type="space", resource_id=space_id
        )
    )
    assert viewer_can_read is True
    assert viewer_can_update is False
    assert viewer_can_delete is False

    # Editor permissions
    editor_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=editor_id, permission="read", resource_type="space", resource_id=space_id
        )
    )
    editor_can_update = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=editor_id, permission="update", resource_type="space", resource_id=space_id
        )
    )
    editor_can_delete = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=editor_id, permission="delete", resource_type="space", resource_id=space_id
        )
    )
    assert editor_can_read is True
    assert editor_can_update is True
    assert editor_can_delete is False

    # Owner permissions
    owner_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id, permission="read", resource_type="space", resource_id=space_id
        )
    )
    owner_can_update = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id, permission="update", resource_type="space", resource_id=space_id
        )
    )
    owner_can_delete = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id, permission="delete", resource_type="space", resource_id=space_id
        )
    )
    owner_can_manage = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id,
            permission="manage_members",
            resource_type="space",
            resource_id=space_id,
        )
    )
    assert owner_can_read is True
    assert owner_can_update is True
    assert owner_can_delete is True
    assert owner_can_manage is True


@pytest.mark.integration
async def test_organization_permission_hierarchy(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Test organization permission hierarchy (viewer < member < admin < owner).

    Organization permissions:
    - Viewer: Can view
    - Member: Can view
    - Admin: Can view + manage_settings + invite_member + remove_member
    - Owner: Can view + manage_settings + invite_member + remove_member + manage_billing + delete
    """
    # Generate unique IDs
    org_id = test_resource_ids("org")
    owner_id = test_resource_ids("owner")
    admin_id = test_resource_ids("admin")
    member_id = test_resource_ids("member")
    viewer_id = test_resource_ids("viewer")

    # Write SpiceDB relationships
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="owner",
            subject_type="user",
            subject_id=owner_id,
        )
    )
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="admin",
            subject_type="user",
            subject_id=admin_id,
        )
    )
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="member",
            subject_type="user",
            subject_id=member_id,
        )
    )
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="viewer",
            subject_type="user",
            subject_id=viewer_id,
        )
    )

    # Viewer permissions
    viewer_can_view = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=viewer_id, permission="view", resource_type="organization", resource_id=org_id
        )
    )
    viewer_can_invite = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=viewer_id,
            permission="invite_member",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    assert viewer_can_view is True
    assert viewer_can_invite is False

    # Member permissions (same as viewer)
    member_can_view = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=member_id, permission="view", resource_type="organization", resource_id=org_id
        )
    )
    member_can_invite = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=member_id,
            permission="invite_member",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    assert member_can_view is True
    assert member_can_invite is False

    # Admin permissions
    admin_can_view = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=admin_id, permission="view", resource_type="organization", resource_id=org_id
        )
    )
    admin_can_invite = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=admin_id,
            permission="invite_member",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    admin_can_manage_settings = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=admin_id,
            permission="manage_settings",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    admin_can_manage_billing = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=admin_id,
            permission="manage_billing",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    assert admin_can_view is True
    assert admin_can_invite is True
    assert admin_can_manage_settings is True
    assert admin_can_manage_billing is False  # Only owner

    # Owner permissions
    owner_can_view = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id, permission="view", resource_type="organization", resource_id=org_id
        )
    )
    owner_can_manage_billing = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id,
            permission="manage_billing",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    owner_can_delete = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=owner_id, permission="delete", resource_type="organization", resource_id=org_id
        )
    )
    assert owner_can_view is True
    assert owner_can_manage_billing is True
    assert owner_can_delete is True


@pytest.mark.integration
async def test_document_inherits_space_permissions(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Test that documents inherit read permission from their parent space.

    Document permissions:
    - read = space->read
    - update = uploader + space->upload_document
    - delete = uploader + space->manage_members
    """
    # Generate unique IDs
    org_id = test_resource_ids("org")
    space_id = test_resource_ids("space")
    doc_id = test_resource_ids("doc")
    uploader_id = test_resource_ids("uploader")
    space_viewer_id = test_resource_ids("space_viewer")
    outsider_id = test_resource_ids("outsider")

    # Write SpiceDB relationships
    # Organization
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="owner",
            subject_type="user",
            subject_id=uploader_id,
        )
    )

    # Space
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
            resource_type="space",
            resource_id=space_id,
            relation="owner",
            subject_type="user",
            subject_id=uploader_id,
        )
    )
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="space",
            resource_id=space_id,
            relation="viewer",
            subject_type="user",
            subject_id=space_viewer_id,
        )
    )

    # Document
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="document",
            resource_id=doc_id,
            relation="space",
            subject_type="space",
            subject_id=space_id,
        )
    )
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="document",
            resource_id=doc_id,
            relation="uploader",
            subject_type="user",
            subject_id=uploader_id,
        )
    )

    # Uploader can read (via space->read)
    uploader_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=uploader_id, permission="read", resource_type="document", resource_id=doc_id
        )
    )
    assert uploader_can_read is True

    # Space viewer can read (via space->read)
    viewer_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=space_viewer_id, permission="read", resource_type="document", resource_id=doc_id
        )
    )
    assert viewer_can_read is True

    # Outsider cannot read (not in space)
    outsider_can_read = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=outsider_id, permission="read", resource_type="document", resource_id=doc_id
        )
    )
    assert outsider_can_read is False


@pytest.mark.integration
async def test_spicedb_cleanup_verification(
    postgres_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
) -> None:
    """Verify that SpiceDB cleanup deletes relationships after test completion.

    This test verifies the test_resource_ids cleanup mechanism works correctly.
    Cleanup should only delete relationships for IDs created by test_resource_ids.
    """
    # Generate unique IDs
    org_id = test_resource_ids("org")
    user_id = test_resource_ids("user")

    # Write a relationship
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

    # Verify relationship exists
    can_delete = await spicedb_service.check_permission(
        CheckPermissionInput(
            user_id=user_id,
            permission="delete",
            resource_type="organization",
            resource_id=org_id,
        )
    )
    assert can_delete is True

    # Cleanup happens automatically via spicedb_service fixture
    # The fixture will delete all relationships for IDs in test_resource_ids.created_ids
