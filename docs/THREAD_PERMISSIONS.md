# Thread Permissions

This document explains the authorization model for threads in Olympus, powered by SpiceDB.

## Overview

Threads in Olympus have a hierarchical permission model that supports both **space-scoped threads** (threads within a specific space) and **org-wide threads** (threads that belong to an organization but not a specific space).

## Schema

Threads have three primary authorization relationships:

1. **Creator**: The user who created the thread
2. **Space**: The space the thread belongs to (optional - org-wide threads have no space)
3. **Organization**: The organization the thread belongs to (required)

### SpiceDB Schema Definition

```zed
definition thread {
    // Relationships
    relation organization: organization
    relation space: space | nil           // Optional (org-wide threads have nil)
    relation creator: user

    // Permissions
    permission delete = creator + space->manage_members + organization->admin
    permission update = creator + space->owner + organization->admin
    permission read = space->read + organization->view
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

A user can **read** a thread if they have:

- **Space read access** (for space-scoped threads via `space->read`), OR
- **Organization view access** (for org-wide threads or as org member)

**Examples:**

- ✅ User A is a space viewer → User A can read all threads in that space
- ✅ User B is an organization member → User B can read all org-wide threads
- ❌ User C is in a different organization → User C cannot read any threads

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

### 2. Org-Wide Threads

Threads that belong to the organization but not a specific space. Accessible to all organization members.

**Relationships:**

```python
thread.organization -> organization_id
thread.space -> nil
thread.creator -> user_id
```

**Permission Inheritance:**

- Read access: All organization members (`organization->view`)
- Update access: creator or org admin only
- Delete access: creator or org admin only

**Example Use Cases:**

- Company-wide announcements
- General discussion threads
- Organization-level insights

## Permission Matrix

| Role               | Space Thread Read | Space Thread Update | Space Thread Delete | Org Thread Read | Org Thread Update | Org Thread Delete |
| ------------------ | ----------------- | ------------------- | ------------------- | --------------- | ----------------- | ----------------- |
| Thread Creator     | ✅                | ✅                  | ✅                  | ✅              | ✅                | ✅                |
| Space Owner        | ✅                | ✅                  | ✅                  | ✅              | ❌                | ❌                |
| Space Admin        | ✅                | ❌                  | ✅                  | ✅              | ❌                | ❌                |
| Space Editor       | ✅                | ❌                  | ❌                  | ✅              | ❌                | ❌                |
| Space Viewer       | ✅                | ❌                  | ❌                  | ✅              | ❌                | ❌                |
| Org Admin          | ✅                | ✅                  | ✅                  | ✅              | ✅                | ✅                |
| Org Member         | ❌\*              | ❌                  | ❌                  | ✅              | ❌                | ❌                |
| Different Org User | ❌                | ❌                  | ❌                  | ❌              | ❌                | ❌                |

\* Org members can only read space threads if they also have space access.

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

### Sync Thread Relationships on Creation

```python
# For space-scoped threads
await spicedb.sync_thread_relationships(
    thread_id=str(thread.id),
    space_id=str(space.id),  # Optional: None for org-wide threads
    organization_id=str(organization.id),
    creator_id=str(user.id)
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
