# Oso Authorization Policies

This directory contains Polar policy files that define access control rules for Olympus using the [Oso authorization library](https://www.osohq.com/).

## Overview

Olympus uses **Oso** for centralized, declarative authorization. All access control logic is defined in `.polar` files using Oso's Polar language, enabling:

- **Centralized authorization**: All permission rules in one place (no scattered inline checks)
- **Declarative policies**: Easy to read, audit, and test
- **Flexible models**: Supports RBAC, ReBAC, and ABAC patterns
- **Type-safe**: Integrated with SQLAlchemy models

## Policy Files

### `organization.polar`

**RBAC (Role-Based Access Control)** for organization resources.

**Roles**:
- `OWNER` - Full control (all permissions)
- `ADMIN` - Management (read, update, manage_settings, invite/remove members)
- `MEMBER` - Read-only access
- `VIEWER` - Read-only access (same as MEMBER)

**Permissions**:
- `read` - View organization details
- `update` - Modify organization settings
- `delete` - Delete organization (owner-only)
- `manage_settings` - Change organization configuration
- `manage_billing` - Manage billing and subscription (owner-only)
- `invite_member` - Invite new members
- `remove_member` - Remove existing members

### `space.polar`

**ReBAC (Relationship-Based Access Control)** for space resources.

**Space Roles**:
- `OWNER` - Full control over space
- `EDITOR` - Read, update, upload documents
- `VIEWER` - Read-only access

**Organization Context**:
- Organization `ADMIN` and `OWNER` roles can manage any space in their organization
- Inherits organization membership for base permissions

**Visibility**:
- **Public spaces**: Any organization member can read
- **Private spaces**: Only explicit space members can access

**Permissions**:
- `read` - View space and its contents
- `update` - Modify space metadata
- `delete` - Delete space
- `upload_document` - Upload documents to space
- `manage_members` - Add/remove space members

### `invitation.polar` (Phase 1A)

**Invitation-specific authorization** for organization invitations.

**Permissions**:
- `invite_member` - Create invitations (admin/owner)
- `revoke_invitation` - Cancel pending invitations (admin/owner)
- `resend_invitation` - Resend invitation emails (admin/owner)
- `accept_invitation` - Accept invitation (invitee)
- `view_invitations` - View all org invitations (admin/owner)
- `view_invitation` - View specific invitation (invitee or admin/owner)

### `document.polar` (Phase 3)

**Document-level authorization** (inherits from space permissions).

**Permissions**:
- `read` - View document (if can read space)
- `update` - Modify document (if uploader or can update space)
- `delete` - Delete document (if uploader or can delete space)
- `share` - Share document externally

## Usage

### Basic Authorization Check

```python
from app.auth.authorization import authorize, PermissionDenied

# Check if user can perform action on resource
if not await authorize(user, "update", organization):
    raise PermissionDenied("Cannot update this organization")
```

### Decorator Pattern

```python
from app.auth.authorization import require_permission

class OrganizationService:
    @require_permission("update")
    async def update_organization(self, user: User, org: Organization, data: dict):
        # Authorization check happens automatically
        # Method only executes if user has permission
        ...
```

### Filtering Allowed Resources

```python
from app.auth.authorization import get_auth_service

auth_service = get_auth_service()

# Get all spaces user can read
allowed_spaces = auth_service.get_allowed_resources(
    user,
    "read",
    Space
)
```

## Testing Policies

Unit tests for policies are in `app/tests/policies/`:

```bash
# Run all policy tests
docker compose exec api poetry run pytest app/tests/policies/ -v

# Test specific policy file
docker compose exec api poetry run pytest app/tests/policies/test_organization.py -v

# Test with coverage
docker compose exec api poetry run pytest app/tests/policies/ --cov=app/policies --cov-report=html
```

## Adding New Policies

1. **Create `.polar` file** in `app/policies/` with policy rules
2. **Register classes** in `AuthorizationService._register_classes()`
3. **Define permissions** in `app/auth/permissions.py` (as enums)
4. **Write tests** in `app/tests/policies/test_<resource>.py`
5. **Update this README** with policy documentation

## Policy Syntax Examples

### Simple Role Check

```polar
# Allow if user has specific role
allow(user: User, "read", org: Organization) if
    has_role(user, "member", org);
```

### Hierarchical Roles

```polar
# Owner can do everything admin can do
allow(user: User, action, org: Organization) if
    has_role(user, "owner", org) and
    action in ["read", "update", "manage_settings"];
```

### Relationship-Based

```polar
# Allow if user is space member
allow(user: User, "read", space: Space) if
    membership in space.members and
    membership.user = user;
```

### Conditional Logic

```polar
# Public spaces readable by any org member
allow(user: User, "read", space: Space) if
    space.is_public and
    has_role(user, "member", space.organization);
```

## Resources

- [Oso Documentation](https://docs.osohq.com/)
- [Polar Language Reference](https://docs.osohq.com/reference/polar/polar-syntax.html)
- [SQLAlchemy Integration](https://docs.osohq.com/guides/sqlalchemy.html)
- [Testing Policies](https://docs.osohq.com/guides/testing.html)

## Troubleshooting

### No rules found for resource

**Symptom**: `OsoException: No rules found for <Resource>`

**Fix**: Ensure the resource class is registered in `AuthorizationService._register_classes()`

### Policies not loading

**Symptom**: Authorization always fails

**Fix**:
1. Check `.polar` files exist in `app/policies/`
2. Verify Polar syntax is valid
3. Restart FastAPI server
4. Check logs for policy loading errors

### Performance issues

**Symptom**: Authorization checks are slow (>10ms)

**Fix**:
1. Use `get_allowed_resources()` for batch filtering
2. Implement caching for frequently-checked permissions
3. Pre-compute roles in database where possible
