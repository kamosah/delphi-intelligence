# Space Access Control Policies
#
# Defines ReBAC (Relationship-Based Access Control) for space resources.
# Space roles: OWNER, EDITOR, VIEWER
# Inherits organization context for additional permissions.
#
# Permission hierarchy:
# - Space OWNER: Full control over space
# - Space EDITOR: Read, update, upload_document
# - Space VIEWER: Read-only access
# - Organization ADMIN/OWNER: Can manage any space in their organization
#
# Public vs Private spaces:
# - Public spaces: Any organization member can read
# - Private spaces: Only explicit space members can access

# ==================================================================================
# Helper Rules
# ==================================================================================

# Check if a user has a specific role in a space
has_space_role(user: User, role, space: Space) if
    # Check if user is the space owner
    role = "owner" and
    space.owner_id = user.id;

has_space_role(user: User, role, space: Space) if
    # Check space membership for non-owner roles
    membership in space.members and
    membership.user_id = user.id and
    membership.member_role.value = role;

# Check if a user has at least a specific space role level
# Role hierarchy: owner > editor > viewer
has_space_role_or_higher(user: User, _min_role, space: Space) if
    has_space_role(user, "owner", space);

has_space_role_or_higher(user: User, "editor", space: Space) if
    has_space_role(user, "editor", space);

has_space_role_or_higher(user: User, "viewer", space: Space) if
    has_space_role(user, "editor", space) or
    has_space_role(user, "viewer", space);

# Check if user is a member of the space's organization
# Note: Reuses has_role helper from organization.polar
is_org_member(user: User, space: Space) if
    has_role_or_higher(user, "viewer", space.organization);

# Check if user is an admin or owner of the space's organization
is_org_admin(user: User, space: Space) if
    has_role_or_higher(user, "admin", space.organization);

# ==================================================================================
# Read Permissions
# ==================================================================================

# Organization admins and owners can always read spaces in their org
allow(user: User, "read", space: Space) if
    is_org_admin(user, space);

# Public spaces can be read by any organization member
allow(user: User, "read", space: Space) if
    space.is_public and
    is_org_member(user, space);

# Private spaces can be read by explicit space members
allow(user: User, "read", space: Space) if
    has_space_role_or_higher(user, "viewer", space);

# ==================================================================================
# Update Permissions
# ==================================================================================

# Organization admins and owners can update any space in their org
allow(user: User, "update", space: Space) if
    is_org_admin(user, space);

# Space owner and editors can update the space
allow(user: User, "update", space: Space) if
    has_space_role_or_higher(user, "editor", space);

# ==================================================================================
# Delete Permissions
# ==================================================================================

# Organization admins and owners can delete any space in their org
allow(user: User, "delete", space: Space) if
    is_org_admin(user, space);

# Space owner can delete the space
allow(user: User, "delete", space: Space) if
    has_space_role(user, "owner", space);

# ==================================================================================
# Document Upload Permissions
# ==================================================================================

# Organization admins and owners can upload to any space in their org
allow(user: User, "upload_document", space: Space) if
    is_org_admin(user, space);

# Space owner and editors can upload documents
allow(user: User, "upload_document", space: Space) if
    has_space_role_or_higher(user, "editor", space);

# ==================================================================================
# Member Management Permissions
# ==================================================================================

# Organization admins and owners can manage members of any space in their org
allow(user: User, "manage_members", space: Space) if
    is_org_admin(user, space);

# Space owner can manage space members
allow(user: User, "manage_members", space: Space) if
    has_space_role(user, "owner", space);

# ==================================================================================
# Visibility Change Permissions (for future implementation)
# ==================================================================================

# Space owner and org admins can change space visibility (public/private)
# This will be used when implementing space settings updates
