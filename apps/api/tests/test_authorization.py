"""Unit tests for Oso authorization service.

Tests authorization policies for organizations and spaces to ensure:
- Owners have full access
- Admins have management permissions but cannot manage billing or delete orgs
- Members are read-only
- Non-members have no access
- Space permissions work correctly with public/private visibility
- Organization admins can manage spaces
"""

import pytest
from sqlalchemy import select

from app.auth.authorization import (
    AuthorizationService,
    PermissionDenied,
    authorize,
    get_auth_service,
    require_permission,
)
from app.auth.permissions import OrganizationPermission, SpacePermission
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember, OrganizationRole
from app.models.space import MemberRole, Space, SpaceMember
from app.models.user import User


# ==================================================================================
# Authorization Service Initialization Tests
# ==================================================================================


def test_auth_service_is_singleton():
    """Test that AuthorizationService is a singleton."""
    service1 = get_auth_service()
    service2 = get_auth_service()
    assert service1 is service2, "AuthorizationService should be a singleton"


def test_auth_service_loads_policies():
    """Test that authorization service loads Polar policies successfully."""
    service = get_auth_service()
    assert service.oso is not None, "Oso instance should be initialized"


# ==================================================================================
# Organization Authorization Tests
# ==================================================================================


@pytest.mark.asyncio
async def test_owner_has_full_org_access(db_session):
    """Test that organization owner has all permissions."""
    # Create test data
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Test all organization permissions
    auth_service = get_auth_service()

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.READ, org
    ), "Owner should be able to read organization"

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.UPDATE, org
    ), "Owner should be able to update organization"

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.DELETE, org
    ), "Owner should be able to delete organization"

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.MANAGE_SETTINGS, org
    ), "Owner should be able to manage settings"

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.MANAGE_BILLING, org
    ), "Owner should be able to manage billing"

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.INVITE_MEMBER, org
    ), "Owner should be able to invite members"

    assert await auth_service.is_allowed(
        owner, OrganizationPermission.REMOVE_MEMBER, org
    ), "Owner should be able to remove members"


@pytest.mark.asyncio
async def test_admin_cannot_manage_billing(db_session):
    """Test that organization admin cannot manage billing or delete org."""
    # Create owner
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    # Create organization
    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create admin user and membership
    admin = User(email="admin@example.com", full_name="Admin User")
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    admin_membership = OrganizationMember(
        organization_id=org.id,
        user_id=admin.id,
        organization_role=OrganizationRole.ADMIN,
    )
    db_session.add(admin_membership)
    await db_session.commit()

    # Refresh org to load members relationship
    await db_session.refresh(org)

    # Test admin permissions
    auth_service = get_auth_service()

    # Admin can read and update
    assert await auth_service.is_allowed(
        admin, OrganizationPermission.READ, org
    ), "Admin should be able to read organization"

    assert await auth_service.is_allowed(
        admin, OrganizationPermission.UPDATE, org
    ), "Admin should be able to update organization"

    assert await auth_service.is_allowed(
        admin, OrganizationPermission.MANAGE_SETTINGS, org
    ), "Admin should be able to manage settings"

    assert await auth_service.is_allowed(
        admin, OrganizationPermission.INVITE_MEMBER, org
    ), "Admin should be able to invite members"

    assert await auth_service.is_allowed(
        admin, OrganizationPermission.REMOVE_MEMBER, org
    ), "Admin should be able to remove members"

    # Admin CANNOT delete org or manage billing
    assert not await auth_service.is_allowed(
        admin, OrganizationPermission.DELETE, org
    ), "Admin should NOT be able to delete organization"

    assert not await auth_service.is_allowed(
        admin, OrganizationPermission.MANAGE_BILLING, org
    ), "Admin should NOT be able to manage billing"


@pytest.mark.asyncio
async def test_member_is_read_only(db_session):
    """Test that organization member has read-only access."""
    # Create owner
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    # Create organization
    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create member user and membership
    member = User(email="member@example.com", full_name="Member User")
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(member)

    member_membership = OrganizationMember(
        organization_id=org.id,
        user_id=member.id,
        organization_role=OrganizationRole.MEMBER,
    )
    db_session.add(member_membership)
    await db_session.commit()

    # Refresh org to load members relationship
    await db_session.refresh(org)

    # Test member permissions
    auth_service = get_auth_service()

    # Member can only read
    assert await auth_service.is_allowed(
        member, OrganizationPermission.READ, org
    ), "Member should be able to read organization"

    # Member CANNOT do anything else
    assert not await auth_service.is_allowed(
        member, OrganizationPermission.UPDATE, org
    ), "Member should NOT be able to update organization"

    assert not await auth_service.is_allowed(
        member, OrganizationPermission.DELETE, org
    ), "Member should NOT be able to delete organization"

    assert not await auth_service.is_allowed(
        member, OrganizationPermission.MANAGE_SETTINGS, org
    ), "Member should NOT be able to manage settings"

    assert not await auth_service.is_allowed(
        member, OrganizationPermission.MANAGE_BILLING, org
    ), "Member should NOT be able to manage billing"

    assert not await auth_service.is_allowed(
        member, OrganizationPermission.INVITE_MEMBER, org
    ), "Member should NOT be able to invite members"

    assert not await auth_service.is_allowed(
        member, OrganizationPermission.REMOVE_MEMBER, org
    ), "Member should NOT be able to remove members"


@pytest.mark.asyncio
async def test_non_member_has_no_org_access(db_session):
    """Test that non-members have no access to organization."""
    # Create owner
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    # Create organization
    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create non-member user (not added to organization)
    non_member = User(email="outsider@example.com", full_name="Outsider User")
    db_session.add(non_member)
    await db_session.commit()
    await db_session.refresh(non_member)

    # Test non-member permissions
    auth_service = get_auth_service()

    # Non-member cannot do anything
    assert not await auth_service.is_allowed(
        non_member, OrganizationPermission.READ, org
    ), "Non-member should NOT be able to read organization"

    assert not await auth_service.is_allowed(
        non_member, OrganizationPermission.UPDATE, org
    ), "Non-member should NOT be able to update organization"


# ==================================================================================
# Space Authorization Tests
# ==================================================================================


@pytest.mark.asyncio
async def test_space_owner_has_full_access(db_session):
    """Test that space owner has all space permissions."""
    # Create users and organization
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create space
    space = Space(
        name="Test Space",
        slug="test-space",
        organization_id=org.id,
        owner_id=owner.id,
        is_public=False,
    )
    db_session.add(space)
    await db_session.commit()
    await db_session.refresh(space)

    # Test space owner permissions
    auth_service = get_auth_service()

    assert await auth_service.is_allowed(
        owner, SpacePermission.READ, space
    ), "Space owner should be able to read space"

    assert await auth_service.is_allowed(
        owner, SpacePermission.UPDATE, space
    ), "Space owner should be able to update space"

    assert await auth_service.is_allowed(
        owner, SpacePermission.DELETE, space
    ), "Space owner should be able to delete space"

    assert await auth_service.is_allowed(
        owner, SpacePermission.UPLOAD_DOCUMENT, space
    ), "Space owner should be able to upload documents"

    assert await auth_service.is_allowed(
        owner, SpacePermission.MANAGE_MEMBERS, space
    ), "Space owner should be able to manage members"


@pytest.mark.asyncio
async def test_public_space_readable_by_org_members(db_session):
    """Test that public spaces are readable by any organization member."""
    # Create owner
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    # Create organization
    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create org member (but not space member)
    member = User(email="member@example.com", full_name="Member User")
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(member)

    member_membership = OrganizationMember(
        organization_id=org.id,
        user_id=member.id,
        organization_role=OrganizationRole.MEMBER,
    )
    db_session.add(member_membership)
    await db_session.commit()
    await db_session.refresh(org)

    # Create PUBLIC space
    space = Space(
        name="Public Space",
        slug="public-space",
        organization_id=org.id,
        owner_id=owner.id,
        is_public=True,  # Public space
    )
    db_session.add(space)
    await db_session.commit()
    await db_session.refresh(space)

    # Test that org member can read public space
    auth_service = get_auth_service()

    assert await auth_service.is_allowed(
        member, SpacePermission.READ, space
    ), "Organization member should be able to read public space"

    # But cannot update, delete, or upload
    assert not await auth_service.is_allowed(
        member, SpacePermission.UPDATE, space
    ), "Organization member should NOT be able to update public space"

    assert not await auth_service.is_allowed(
        member, SpacePermission.UPLOAD_DOCUMENT, space
    ), "Organization member should NOT be able to upload to public space"


@pytest.mark.asyncio
async def test_private_space_blocks_non_members(db_session):
    """Test that private spaces block non-space-members."""
    # Create owner
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    # Create organization
    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create org member (but not space member)
    member = User(email="member@example.com", full_name="Member User")
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(member)

    member_membership = OrganizationMember(
        organization_id=org.id,
        user_id=member.id,
        organization_role=OrganizationRole.MEMBER,
    )
    db_session.add(member_membership)
    await db_session.commit()
    await db_session.refresh(org)

    # Create PRIVATE space
    space = Space(
        name="Private Space",
        slug="private-space",
        organization_id=org.id,
        owner_id=owner.id,
        is_public=False,  # Private space
    )
    db_session.add(space)
    await db_session.commit()
    await db_session.refresh(space)

    # Test that org member CANNOT read private space (not a space member)
    auth_service = get_auth_service()

    assert not await auth_service.is_allowed(
        member, SpacePermission.READ, space
    ), "Organization member should NOT be able to read private space"


@pytest.mark.asyncio
async def test_org_admin_can_manage_any_space(db_session):
    """Test that organization admins can manage any space in their org."""
    # Create owner
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    # Create organization
    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Create org admin
    admin = User(email="admin@example.com", full_name="Admin User")
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    admin_membership = OrganizationMember(
        organization_id=org.id,
        user_id=admin.id,
        organization_role=OrganizationRole.ADMIN,
    )
    db_session.add(admin_membership)
    await db_session.commit()
    await db_session.refresh(org)

    # Create private space owned by someone else
    space_owner = User(email="space_owner@example.com", full_name="Space Owner")
    db_session.add(space_owner)
    await db_session.commit()
    await db_session.refresh(space_owner)

    space = Space(
        name="Private Space",
        slug="private-space",
        organization_id=org.id,
        owner_id=space_owner.id,
        is_public=False,
    )
    db_session.add(space)
    await db_session.commit()
    await db_session.refresh(space)

    # Test that org admin can manage the space (even though they're not space owner/member)
    auth_service = get_auth_service()

    assert await auth_service.is_allowed(
        admin, SpacePermission.READ, space
    ), "Org admin should be able to read any space"

    assert await auth_service.is_allowed(
        admin, SpacePermission.UPDATE, space
    ), "Org admin should be able to update any space"

    assert await auth_service.is_allowed(
        admin, SpacePermission.DELETE, space
    ), "Org admin should be able to delete any space"

    assert await auth_service.is_allowed(
        admin, SpacePermission.UPLOAD_DOCUMENT, space
    ), "Org admin should be able to upload to any space"

    assert await auth_service.is_allowed(
        admin, SpacePermission.MANAGE_MEMBERS, space
    ), "Org admin should be able to manage members of any space"


# ==================================================================================
# Helper Function Tests
# ==================================================================================


@pytest.mark.asyncio
async def test_authorize_helper_function(db_session):
    """Test that authorize() helper function works correctly."""
    # Create test data
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Test authorize helper
    assert await authorize(
        owner, OrganizationPermission.READ, org
    ), "authorize() helper should work"


@pytest.mark.asyncio
async def test_require_permission_decorator(db_session):
    """Test that @require_permission decorator works correctly."""

    # Create test data
    owner = User(email="owner@example.com", full_name="Owner User")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    org = Organization(
        name="Test Organization", slug="test-org", owner_id=owner.id, owner=owner
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Test decorated function
    @require_permission("update")
    async def update_org(user: User, org: Organization, name: str):
        org.name = name
        return org

    # Should succeed for owner
    result = await update_org(user=owner, org=org, name="New Name")
    assert result.name == "New Name", "Decorated function should execute successfully"

    # Create member (read-only)
    member = User(email="member@example.com", full_name="Member User")
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(member)

    member_membership = OrganizationMember(
        organization_id=org.id,
        user_id=member.id,
        organization_role=OrganizationRole.MEMBER,
    )
    db_session.add(member_membership)
    await db_session.commit()
    await db_session.refresh(org)

    # Should fail for member
    with pytest.raises(PermissionDenied):
        await update_org(user=member, org=org, name="Unauthorized Change")
