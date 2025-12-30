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

## Next Steps

After setup:
1. ✅ SpiceDB running in Docker
2. ✅ Schema loaded
3. ✅ Tests passing
4. 🚧 Integrate with API endpoints (Phase 2)
5. 🚧 Add permission checks to GraphQL resolvers (Phase 3)

## References

- [SpiceDB Documentation](https://authzed.com/docs)
- [Olympus Authorization Schema](./app/policies/olympus.zed)
- [SpiceDB Service](./app/services/spicedb_service.py)
- [Integration Tests](./tests/test_spicedb_service.py)
- [ADR-013: Authorization System](../../docs/adr/013-authorization-system-spicedb.md)
