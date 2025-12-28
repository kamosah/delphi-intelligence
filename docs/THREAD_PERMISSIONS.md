# Thread Permissions

This document explains the authorization model for threads in Olympus, powered by SpiceDB.

## Overview

Threads in Olympus have a hierarchical permission model that supports both **space threads** (threads within a specific space) and **personal threads** (threads that belong to a user only, without space or org affiliation).

## Schema

Threads have three primary authorization relationships:

1. **Creator**: The user who created the thread
2. **Space**: The space the thread belongs to (optional - personal threads have no space)
3. **Organization**: The organization the thread belongs to (optional - personal threads have no organization)

### SpiceDB Schema Definition

```zed
definition thread {
    // Relationships
    relation organization: organization
    relation space: space                 // Optional: not set for personal threads
    relation creator: user

    // Permissions
    permission delete = creator + space->manage_members + organization->admin
    permission update = creator + space->owner + organization->admin
    permission read = space->read + creator
}
```

## Permission Rules

### Delete Permission

A user can **delete** a thread if they are:

- The **creator** of the thread, OR
- A **space admin** (for space-scoped threads via `space->manage_members`), OR
- An **organization admin** (for any thread in their organization)

**Examples:**

- ✅ User A creates a thread in Space X → User A can delete it
- ✅ User B is a space admin for Space X → User B can delete any thread in Space X
- ✅ User C is an organization admin → User C can delete any thread in the organization

### Update Permission

A user can **update** a thread if they are:

- The **creator** of the thread, OR
- The **space owner** (for space-scoped threads), OR
- An **organization admin**

**Examples:**

- ✅ User A creates a thread → User A can update it
- ✅ User B is the space owner → User B can update any thread in their space
- ✅ User C is an organization admin → User C can update any thread in the organization
- ❌ User D is a space editor → User D cannot update threads they didn't create

### Read Permission

A user can **read** a thread if:

- They have **read access to the thread's space** (for space threads), OR
- They are the **creator** of the thread (for personal threads)

**Permission definition:**

```zed
permission read = space->read + creator
```

This ensures proper access control for both thread types:

**Space threads:**

- Visibility controlled by space membership
- Only users with space access can read threads in that space
- Org members CANNOT read threads from private spaces they don't have access to

**Personal threads:**

- Only the creator can read their personal threads
- No space membership required

**Examples:**

- ✅ User A has `read` access to Space X → User A can read all threads in Space X
- ❌ User B is org member but lacks space access → User B CANNOT read threads in Space X
- ✅ User C creates a personal thread → User C can read their personal thread
- ❌ User D tries to read User C's personal thread → User D CANNOT access it

## Thread Types

### 1. Space-Scoped Threads

Threads that belong to a specific space. Permissions are inherited from the space.

**Relationships:**

```python
thread.organization -> organization_id
thread.space -> space_id
thread.creator -> user_id
```

**Permission Inheritance:**

- Read access inherits from space (`space->read`)
- Update access: creator, space owner, or org admin
- Delete access: creator, space admin, or org admin

**Example Use Cases:**

- Project-specific analysis threads
- Team collaboration threads
- Department-scoped threads

### 2. Personal Threads

Threads that belong to a user only, without space or organization affiliation. Only accessible to the creator.

**Relationships:**

```python
thread.organization -> organization_id
thread.space -> None  # No space for personal threads
thread.creator -> user_id
```

**Permission Inheritance:**

- Read access: Creator only (via `creator`)
- Update access: Creator or org admin only
- Delete access: Creator or org admin only

**Example Use Cases:**

- Personal analysis threads
- Private notes and research
- Individual user drafts

## Permission Matrix

| Role               | Space Thread Read | Space Thread Update | Space Thread Delete | Personal Thread Read | Personal Thread Update | Personal Thread Delete |
| ------------------ | ----------------- | ------------------- | ------------------- | -------------------- | ---------------------- | ---------------------- |
| Thread Creator     | ✅                | ✅                  | ✅                  | ✅                   | ✅                     | ✅                     |
| Space Owner        | ✅                | ✅                  | ✅                  | ❌                   | ❌                     | ❌                     |
| Space Admin        | ✅                | ❌                  | ✅                  | ❌                   | ❌                     | ❌                     |
| Space Editor       | ✅                | ❌                  | ❌                  | ❌                   | ❌                     | ❌                     |
| Space Viewer       | ✅                | ❌                  | ❌                  | ❌                   | ❌                     | ❌                     |
| Org Admin          | ✅                | ✅                  | ✅                  | ❌\*\*               | ✅                     | ✅                     |
| Org Member         | ❌\*              | ❌                  | ❌                  | ❌                   | ❌                     | ❌                     |
| Different Org User | ❌                | ❌                  | ❌                  | ❌                   | ❌                     | ❌                     |

\* Org members can only read space threads if they also have space access.
\*\* Org admins can update/delete personal threads for moderation purposes, but cannot read the content (privacy protection).

## Implementation Examples

### Check Thread Update Permission

```python
from app.schemas.spicedb import CheckPermissionInput
from app.services.spicedb_service import get_spicedb_service

spicedb = get_spicedb_service()

has_permission = await spicedb.check_permission(
    CheckPermissionInput(
        user_id=str(user.id),
        permission="update",
        resource_type="thread",
        resource_id=str(thread_id),
    )
)

if not has_permission:
    raise ValueError("Insufficient permissions to update this thread")
```

### Thread Creation Authorization Flow

**Before creating a thread, verify:**

1. **Organization Membership (ALWAYS)**: User must be a member of the organization
2. **Space Access (if space thread)**: User must have `read` access to the space

```python
# Step 1: ALWAYS verify org membership (for both thread types)
org_member_stmt = select(OrganizationMemberModel).where(
    OrganizationMemberModel.organization_id == org_id,
    OrganizationMemberModel.user_id == user_id,
)
org_member_result = await session.execute(org_member_stmt)
org_member = org_member_result.scalar_one_or_none()

if not org_member:
    raise ValueError("User is not a member of this organization")

# Step 2: If space thread, verify space access (additional check)
if space_id:
    spicedb = get_spicedb_service()
    has_permission = await spicedb.check_permission(
        CheckPermissionInput(
            user_id=str(user_id),
            permission="read",
            resource_type="space",
            resource_id=str(space_id),
        )
    )

    if not has_permission:
        raise ValueError("Insufficient permissions to create thread in this space")

# After authorization checks pass, sync relationships
await spicedb.sync_thread_relationships(
    thread_id=str(thread.id),
    organization_id=str(organization.id),
    creator_id=str(user.id),
    space_id=str(space.id) if space_id else None,
)
```

### Cleanup on Thread Deletion

```python
# After deleting thread from database
await session.delete(thread_model)
await session.commit()

# Cleanup SpiceDB relationships
spicedb = get_spicedb_service()
if not await spicedb.remove_thread_relationships(str(thread_id)):
    logger.warning(f"Failed to delete thread relationships: {thread_id}")
```

## Security Considerations

### Fail-Closed Authorization

All SpiceDB permission checks are **fail-closed** by design:

```python
try:
    has_permission = await spicedb.check_permission(...)
except Exception as e:
    logger.error(f"SpiceDB check failed: {e}")
    has_permission = False  # Deny on error
```

This ensures that if SpiceDB is unavailable or encounters an error, users are denied access rather than inadvertently granted access.

### Cross-Tenant Isolation

Threads are strictly isolated by organization:

- Users from Organization A cannot access threads from Organization B
- Space membership does not grant cross-organization access
- Thread relationships are scoped to organization boundaries

**Example:**

```python
# User in Org A tries to access thread in Org B
has_permission = await spicedb.check_permission(
    CheckPermissionInput(
        user_id="user_org_a",
        permission="read",
        resource_type="thread",
        resource_id="thread_org_b",
    )
)
# Result: False (cross-tenant isolation enforced)
```

### Relationship Consistency

Thread relationships must stay synchronized with the database:

1. **On Thread Creation**: Call `sync_thread_relationships()` immediately after database insert
2. **On Thread Deletion**: Call `remove_thread_relationships()` immediately after database delete
3. **On Space Transfer**: Update space relationship if thread moves between spaces

## Testing

All thread permissions are covered by integration tests in `tests/test_spicedb_permissions_integration.py`:

- ✅ Thread creator can update and delete
- ✅ Non-creator cannot update (unless admin)
- ✅ Org admin can override thread permissions
- ✅ Cross-tenant isolation verified
- ✅ Org-wide thread permissions tested

Run tests:

```bash
docker compose exec api poetry run pytest tests/test_spicedb_permissions_integration.py -v
```

## Related Documentation

- [ADR-013: Authorization System - SpiceDB Migration](./adr/013-authorization-system-spicedb.md)
- [SpiceDB Schema](../apps/api/app/policies/olympus.zed)
- [SpiceDB Service Implementation](../apps/api/app/services/spicedb_service.py)
- [Integration Tests](../apps/api/tests/test_spicedb_permissions_integration.py)

## References

- [SpiceDB Documentation](https://authzed.com/docs/spicedb/getting-started/discovering-spicedb)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [AuthZed Playground](https://play.authzed.com/) - Test schema patterns
