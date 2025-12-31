# SpiceDB Local Setup Guide

## Overview

SpiceDB runs **locally in Docker** as part of the Olympus development environment. No cloud account or external service is needed.

## Prerequisites

- Docker and Docker Compose installed
- Supabase database connection configured in `apps/api/.env` (DATABASE_URL)

## Quick Setup

### 1. Generate SpiceDB Token

Generate a secure random token for local development:

```bash
# macOS/Linux
openssl rand -base64 32

# Or use any secure random string generator
```

### 2. Configure Environment Variables

Add these to **both** `.env` files:

#### File: `apps/api/.env`

```env
# SpiceDB Configuration (for authorization)
SPICEDB_TOKEN=<your-generated-token-here>
SPICEDB_ENDPOINT=spicedb:50051
# Uses same Supabase database connection for SpiceDB datastore
# Note: Remove +asyncpg from DATABASE_URL for SpiceDB
SPICEDB_DATASTORE_CONN_URI=postgresql://postgres.[your-project-ref]:[password]@aws-X-[region].pooler.supabase.com:5432/postgres
```

#### File: `.env` (repo root)

```env
# SpiceDB Configuration (required by docker-compose.yml)
SPICEDB_TOKEN=<same-token-as-above>
SPICEDB_DATASTORE_CONN_URI=postgresql://postgres.[your-project-ref]:[password]@aws-X-[region].pooler.supabase.com:5432/postgres
```

**Important**: Docker Compose reads from the **repo root** `.env` file for variable substitution (`${SPICEDB_TOKEN}`), while the API service reads from `apps/api/.env`. Both need these variables.

### 3. Start SpiceDB

```bash
# From repository root
docker compose up spicedb -d

# Check status
docker compose ps spicedb

# View logs
docker compose logs spicedb --tail=20

# Verify health
docker compose exec spicedb spicedb version
```

### 4. Load Authorization Schema

```bash
# Load the Olympus authorization schema
docker compose exec -T spicedb zed schema write < apps/api/app/policies/olympus.zed

# Verify schema loaded
docker compose exec spicedb zed schema read
```

#### 4a. Using zed CLI Locally (M1/ARM64 Macs - Recommended)

**Issue**: Docker Rosetta on M1/ARM64 Macs causes `rosetta error: failed to open elf` when using `docker compose exec` with zed commands.

**Solution**: Use local zed CLI directly instead of going through Docker:

```bash
# Install zed CLI (if not already installed)
brew install authzed/tap/zed

# Load schema using local zed (bypasses Docker/Rosetta)
zed schema write \
  --endpoint localhost:50051 \
  --token "$(grep SPICEDB_TOKEN apps/api/.env | cut -d= -f2)" \
  --insecure \
  app/policies/olympus.zed

# Read schema
zed schema read \
  --endpoint localhost:50051 \
  --token "$(grep SPICEDB_TOKEN apps/api/.env | cut -d= -f2)" \
  --insecure

# Create relationships
zed relationship create thread:THREAD_ID owner user:USER_ID \
  --endpoint localhost:50051 \
  --token "$(grep SPICEDB_TOKEN apps/api/.env | cut -d= -f2)" \
  --insecure

# Read relationships
zed relationship read thread creator \
  --endpoint localhost:50051 \
  --token "$(grep SPICEDB_TOKEN apps/api/.env | cut -d= -f2)" \
  --insecure \
  --json
```

**Why This Works**:
- `localhost:50051` connects directly to the SpiceDB Docker container's exposed port
- Bypasses Docker exec layer that causes Rosetta compatibility issues
- Uses same token from `.env` file for authentication
- `--insecure` flag required for local development (no TLS)

**When to Use**:
- ✅ **Always use local zed on M1/ARM64 Macs** to avoid Rosetta errors
- ✅ For bulk operations (schema updates, relationship migrations)
- ✅ For scripting and automation
- ❌ Not needed on x86_64/Intel Macs or Linux (Docker exec works fine)

### 5. Run Integration Tests

```bash
cd apps/api
docker compose exec api poetry run pytest tests/test_spicedb_service.py -v
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Docker Compose Network                                 │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   API        │ gRPC    │  SpiceDB     │             │
│  │  (FastAPI)   │────────▶│  (Local)     │             │
│  │              │:50051   │              │             │
│  └──────────────┘         └──────┬───────┘             │
│                                   │                      │
│                                   │                      │
└───────────────────────────────────┼──────────────────────┘
                                    │
                                    │ PostgreSQL
                                    ▼
                         ┌──────────────────────┐
                         │  Supabase Database   │
                         │  (Cloud)             │
                         └──────────────────────┘
```

**Key Points**:
- SpiceDB runs in Docker (locally)
- Uses your existing Supabase database as its datastore
- No SpiceDB cloud account needed
- API communicates with SpiceDB via gRPC on port 50051

## Configuration Details

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SPICEDB_TOKEN` | Pre-shared key for authentication | `dev-secret-token-...` |
| `SPICEDB_ENDPOINT` | gRPC endpoint (Docker service name) | `spicedb:50051` |
| `SPICEDB_DATASTORE_CONN_URI` | PostgreSQL connection (without asyncpg) | `postgresql://postgres...` |

### Docker Compose Configuration

SpiceDB service (`docker-compose.yml`):
- **Image**: `authzed/spicedb:v1.48.0`
- **Ports**: 50051 (gRPC), 8443 (HTTP)
- **Datastore**: Uses existing Supabase PostgreSQL
- **Health Check**: gRPC health check on port 50051

## Common Issues

### Issue: SpiceDB won't start - "preshared key must be provided"

**Solution**: Ensure `SPICEDB_TOKEN` is set in **repo root** `.env` file

```bash
# Check if token is set
grep SPICEDB_TOKEN .env

# If missing, add it
echo "SPICEDB_TOKEN=$(openssl rand -base64 32)" >> .env
```

### Issue: SpiceDB can't connect to database

**Solution**: Verify `SPICEDB_DATASTORE_CONN_URI` is correct (without `+asyncpg`)

```bash
# Check DATABASE_URL in apps/api/.env
grep DATABASE_URL apps/api/.env

# Convert for SpiceDB (remove +asyncpg)
# postgresql+asyncpg://... → postgresql://...
```

### Issue: API can't connect to SpiceDB

**Solution**: Ensure both services are running and healthy

```bash
docker compose ps spicedb api
docker compose logs spicedb
docker compose logs api
```

## Testing

### Run Integration Tests

```bash
cd apps/api
docker compose exec api poetry run pytest tests/test_spicedb_service.py -v
```

### Manual Permission Checks

```python
# In Python shell
from app.services.spicedb_service import get_spicedb_service
from uuid import uuid4
from app.schemas.spicedb import WriteRelationshipInput, CheckPermissionInput

service = get_spicedb_service()

# Write relationship
user_id = str(uuid4())
org_id = str(uuid4())
await service.write_relationship(
    WriteRelationshipInput(
        resource_type="organization",
        resource_id=org_id,
        relation="owner",
        subject_type="user",
        subject_id=user_id
    )
)

# Check permission
has_perm = await service.check_permission(
    CheckPermissionInput(
        user_id=user_id,
        permission="manage_settings",
        resource_type="organization",
        resource_id=org_id
    )
)
print(has_perm)  # Should be True
```

## Thread Ownership Model (LOG-254, LOG-255, LOG-256)

### Overview

Threads use a **user-centric ownership model** with **visibility-based access control** enforced by SpiceDB.

### Ownership Fields (Database)

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `owner_user_id` | UUID | Yes | Current owner (mutable, SET NULL on user delete) |
| `created_by` | UUID | Yes | Original creator (immutable, historical provenance) |
| `visibility` | Enum | No | Access scope (PERSONAL, SPACE, ORGANIZATION) |
| `organization_id` | UUID | Yes | Organization context (nullable for personal threads) |
| `space_id` | UUID | Yes | Space context (nullable for personal/org threads) |

### Visibility Model

Threads have three visibility levels that determine access rules:

#### 1. PERSONAL Threads
- **Database**: `visibility=PERSONAL`, `organization_id=NULL`, `space_id=NULL`
- **Access**: Owner only
- **Authorization**: PostgreSQL RLS (future: LOG-259)
- **Use case**: Personal drafts, private analysis

#### 2. SPACE Threads
- **Database**: `visibility=SPACE`, `space_id!=NULL`, `organization_id!=NULL`
- **Access**: All space members (owner, editor, viewer)
- **Authorization**: SpiceDB `thread->read` permission (via `space->read`)
- **Use case**: Team collaboration, project-specific threads

#### 3. ORGANIZATION Threads
- **Database**: `visibility=ORGANIZATION`, `space_id=NULL`, `organization_id!=NULL`
- **Access**: All organization members
- **Authorization**: SpiceDB `thread->read_org` permission (via `organization->view`)
- **Use case**: Company-wide announcements, shared resources

### Dual Read Permissions

Threads use **two separate read permissions** to prevent permission leaks:

```zed
definition thread {
  relation owner: user
  relation organization: organization    // Optional
  relation space: space                  // Optional

  // Space-scoped & personal threads
  permission read = owner + space->read

  // Organization-wide threads
  permission read_org = owner + organization->view
}
```

#### Permission Selection Logic

**Application code selects permission based on thread visibility**:

```python
# Select permission based on thread's space_id
permission = "read" if thread.space_id else "read_org"

has_access = await spicedb.check_permission(
    CheckPermissionInput(
        user_id=user.id,
        permission=permission,
        resource_type="thread",
        resource_id=thread.id,
    )
)

# Logic:
# - If space_id != None → use 'read' permission (space-scoped)
# - If space_id == None → use 'read_org' permission (org-wide)
```

**Why split permissions?**
- Prevents organization members from bypassing space restrictions
- Space threads remain isolated within team workspaces
- Organization threads are explicitly company-wide

### Permission Matrix

| Visibility | Owner | Space Member | Org Member (not in space) |
|------------|-------|--------------|---------------------------|
| PERSONAL | ✅ Read/Write/Delete | ❌ No access | ❌ No access |
| SPACE | ✅ Read/Write/Delete | ✅ Read | ❌ No access |
| ORGANIZATION | ✅ Read/Write/Delete | N/A | ✅ Read |

### SpiceDB Relationships

```bash
# Space thread
zed relationship create thread:THREAD_ID owner user:USER_ID
zed relationship create thread:THREAD_ID space space:SPACE_ID
zed relationship create thread:THREAD_ID organization organization:ORG_ID

# Organization thread (no space)
zed relationship create thread:THREAD_ID owner user:USER_ID
zed relationship create thread:THREAD_ID organization organization:ORG_ID

# Personal thread (no SpiceDB sync - uses PostgreSQL RLS)
# - No relationships created
# - Access controlled at database level (future: LOG-259)
```

### Thread Creation Authorization

**Space threads** require write access to the space:

```python
# Check user has 'update' permission on space (owner/editor role)
has_permission = await spicedb.check_permission(
    CheckPermissionInput(
        user_id=user_id,
        permission="update",  # Not "read" - ensures write access
        resource_type="space",
        resource_id=space_id,
    )
)

if not has_permission:
    raise ValueError("Insufficient permissions. Must be space owner or editor.")
```

This prevents space **viewers** from creating threads (they can only read).

### Message Author Tracking

Messages track authorship for SpiceDB permission checks:

```python
# User message
Message(
    thread_id=thread.id,
    message_role=MessageRole.USER,
    author_user_id=user.id,           # User who wrote it
    author_type=AuthorType.USER,      # Human-generated
    content=query,
)

# AI assistant message
Message(
    thread_id=thread.id,
    message_role=MessageRole.ASSISTANT,
    author_user_id=None,              # No user author (AI)
    author_type=AuthorType.AGENT,     # AI-generated
    content=response,
)
```

**SpiceDB message permissions**:
```zed
definition message {
  relation thread: thread
  relation author: user  // Nullable for agent/system messages

  permission read = thread->read + thread->read_org
  permission update = author
  permission delete = thread->owner + author
}
```

Users can edit their own messages, but not AI responses.

### Thread Listing Queries

**Space threads** (all threads in accessible spaces):
```python
# Returns ALL threads in space, not just user's
threads = (
    select(ThreadModel)
    .where(ThreadModel.space_id == space_uuid)
    .order_by(ThreadModel.created_at.desc())
)
```

**Organization threads** (org-wide + user's personal):
```python
# Returns org-wide threads + user's personal threads
threads = (
    select(ThreadModel)
    .where(
        (ThreadModel.organization_id == org_uuid)
        & (
            # Org threads (no space, visible to all org members)
            (ThreadModel.space_id.is_(None))
            # OR user's personal threads
            | (ThreadModel.owner_user_id == user_id)
        )
    )
    .order_by(ThreadModel.created_at.desc())
)
```

### Migration (LOG-255)

**Backfill existing threads** with owner relationships:

```bash
# Run backfill script
docker compose exec api python scripts/backfill_thread_ownership.py

# Verify relationships created
zed relationship read thread owner \
  --endpoint localhost:50051 \
  --token "$(grep SPICEDB_TOKEN apps/api/.env | cut -d= -f2)" \
  --insecure \
  --json
```

The script:
- Sets `thread->owner` relationship for all existing threads
- Creates `thread->organization` relationships
- Creates `thread->space` relationships (if space_id present)
- Idempotent (safe to run multiple times)

## Next Steps

After setup:
1. ✅ SpiceDB running in Docker
2. ✅ Schema loaded with thread ownership model
3. ✅ Tests passing (including thread ownership tests)
4. ✅ Backfill script executed (LOG-255)
5. ✅ Thread permissions migrated to SpiceDB (LOG-256)

## References

- [SpiceDB Documentation](https://authzed.com/docs)
- [Olympus Authorization Schema](./app/policies/olympus.zed)
- [SpiceDB Service](./app/services/spicedb_service.py)
- [Integration Tests](./tests/test_spicedb_service.py)
- [ADR-013: Authorization System](../../docs/adr/013-authorization-system-spicedb.md)
