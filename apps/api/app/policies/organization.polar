# Organization Access Control Policies
#
# Defines RBAC (Role-Based Access Control) for organization resources.
# Roles: OWNER, ADMIN, MEMBER, VIEWER
#
# Permission hierarchy:
# - OWNER: Full control (all permissions)
# - ADMIN: Management (read, update, manage_settings, invite_member, remove_member)
# - MEMBER: Read-only access
# - VIEWER: Read-only access (same as MEMBER for organizations)

# ==================================================================================
# Helper Rules
# ==================================================================================

# Check if a user has a specific role in an organization
has_role(user: User, role, org: Organization) if
    # Check if user is the organization owner
    role = "owner" and
    org.owner_id = user.id;

has_role(user: User, role, org: Organization) if
    # Check organization membership for non-owner roles
    membership in org.members and
    membership.user_id = user.id and
    membership.organization_role.value = role;

# Check if a user has at least a specific role level
# Role hierarchy: owner > admin > member > viewer
has_role_or_higher(user: User, _min_role, org: Organization) if
    has_role(user, "owner", org);

has_role_or_higher(user: User, "admin", org: Organization) if
    has_role(user, "admin", org);

has_role_or_higher(user: User, "member", org: Organization) if
    has_role(user, "admin", org) or
    has_role(user, "member", org);

has_role_or_higher(user: User, "viewer", org: Organization) if
    has_role(user, "admin", org) or
    has_role(user, "member", org) or
    has_role(user, "viewer", org);

# ==================================================================================
# Read Permissions
# ==================================================================================

# Any organization member (including owner) can read the organization
allow(user: User, "read", org: Organization) if
    has_role_or_higher(user, "viewer", org);

# ==================================================================================
# Update Permissions
# ==================================================================================

# Admin and owner can update organization details
allow(user: User, "update", org: Organization) if
    has_role_or_higher(user, "admin", org);

# ==================================================================================
# Delete Permissions
# ==================================================================================

# Only the owner can delete the organization
allow(user: User, "delete", org: Organization) if
    has_role(user, "owner", org);

# ==================================================================================
# Settings Management
# ==================================================================================

# Admin and owner can manage organization settings
allow(user: User, "manage_settings", org: Organization) if
    has_role_or_higher(user, "admin", org);

# ==================================================================================
# Billing Management
# ==================================================================================

# Only the owner can manage billing and subscriptions
allow(user: User, "manage_billing", org: Organization) if
    has_role(user, "owner", org);

# ==================================================================================
# Member Management
# ==================================================================================

# Admin and owner can invite new members
allow(user: User, "invite_member", org: Organization) if
    has_role_or_higher(user, "admin", org);

# Admin and owner can remove members
allow(user: User, "remove_member", org: Organization) if
    has_role_or_higher(user, "admin", org);

# ==================================================================================
# Role Change Permissions (for future implementation)
# ==================================================================================

# Admin can change roles for members and viewers (but not owners or other admins)
# Owner can change any role
# Note: This will be used in Phase 3 when migrating member role updates
