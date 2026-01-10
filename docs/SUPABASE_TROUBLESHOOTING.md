# Supabase Local Development Troubleshooting

## Issue: Containers Fail Health Checks on Startup

### Symptoms

```bash
npx supabase start
# ... containers start ...
Waiting for health checks...
supabase_analytics_olympus container is not ready: unhealthy
supabase_realtime_olympus container is not ready: unhealthy
Stopping containers...
```

### Root Cause

PostgreSQL connection pool exhaustion during parallel service initialization. With limited Docker memory (< 4GB), all services compete for database connections during startup, causing timeouts.

**Error Indicators**:

- `connection not available and request was dropped from queue after 10079ms`
- `client timed out because it queued and checked out the connection for longer than 15000ms`
- Multiple containers marked "unhealthy" after startup

---

## Solution 1: Increase Docker Memory (Recommended)

**macOS (Docker Desktop)**:

1. Open Docker Desktop
2. Go to **Settings** (gear icon) → **Resources**
3. Increase **Memory** to **6 GB** (from default 2-4GB)
4. Click **Apply & Restart**

**Linux (Docker Engine)**:

```bash
# Edit docker daemon config
sudo nano /etc/docker/daemon.json

# Add memory limit
{
  "default-runtime": "runc",
  "default-ulimits": {
    "memlock": {
      "Hard": -1,
      "Name": "memlock",
      "Soft": -1
    }
  }
}

# Restart Docker
sudo systemctl restart docker
```

**Verify**:

```bash
docker system info | grep "Total Memory"
# Should show: Total Memory: 6GiB (or higher)
```

**Then try again**:

```bash
npx supabase stop
npx supabase start
```

---

## Solution 2: Disable Non-Essential Services

If you can't increase Docker memory, disable analytics and edge runtime:

**Edit `supabase/config.toml`**:

```toml
[analytics]
enabled = false  # Saves ~150MB memory

[edge_runtime]
enabled = false  # Saves ~100MB memory
```

**Restart Supabase**:

```bash
npx supabase stop
npx supabase start
```

---

## Solution 3: Use Cloud Supabase for Tests

Skip local Supabase entirely and use the cloud test instance:

**Already configured in `.env.test`**:

```bash
# Cloud Supabase (no Docker required)
SUPABASE_URL=https://xzwyednemlpsxxzdosvp.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Run tests**:

```bash
cd apps/api
poetry run pytest tests/integration/test_rest_auth.py -v
```

Tests will use real cloud Supabase instead of local Docker instance.

---

## Solution 4: Sequential Startup (Advanced)

Start PostgreSQL first, then other services:

```bash
# Start only database
docker run -d --name supabase_db \
  -e POSTGRES_PASSWORD=postgres \
  -p 54322:5432 \
  public.ecr.aws/supabase/postgres:15.6.1.139

# Wait for PostgreSQL
sleep 10

# Now start full Supabase
npx supabase start
```

---

## Verification Steps

### 1. Check Container Status

```bash
npx supabase status
```

**Expected Output**:

```
         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJ...
service_role key: eyJ...
```

### 2. Test Database Connection

```bash
docker exec -it supabase_db_olympus \
  psql -U postgres -c "SELECT version();"
```

### 3. Test Auth API

```bash
curl http://127.0.0.1:54321/auth/v1/health
# Should return: {"status":"ok"}
```

---

## Common Issues

### Issue: "No such container: supabase_db_olympus"

**Cause**: Containers exited during failed startup
**Fix**: Clean up and restart

```bash
npx supabase stop
docker rm -f $(docker ps -aq --filter "name=supabase") 2>/dev/null
npx supabase start
```

### Issue: Port conflicts (54321, 54322, etc.)

**Cause**: Another process using Supabase ports
**Fix**: Find and kill conflicting processes

```bash
lsof -ti:54321 | xargs kill -9
lsof -ti:54322 | xargs kill -9
```

### Issue: "WARN: no seed files matched pattern: supabase/seed.sql"

**Cause**: Missing seed file (expected, not an error)
**Fix**: Create `supabase/seed.sql` or ignore warning

---

## Resource Requirements

**Minimum** (unstable):

- Memory: 4GB
- CPUs: 2

**Recommended** (stable):

- Memory: 6GB
- CPUs: 4-8

**Production** (heavy load):

- Memory: 8-16GB
- CPUs: 8+

---

## Docker Desktop Settings (macOS)

**Path**: Docker Desktop → Preferences → Resources

**Recommended Settings**:

```
Memory: 6 GB
CPUs: 4
Swap: 2 GB
Disk image size: 60 GB
```

**Apply Changes**: Click "Apply & Restart"

---

## Alternative: Use Colima (Docker Desktop Replacement)

If Docker Desktop is slow on macOS:

```bash
# Install Colima
brew install colima

# Start with more resources
colima start --cpu 4 --memory 6

# Install Docker CLI
brew install docker

# Use normally
npx supabase start
```

---

## Debugging Commands

```bash
# View all container logs
docker logs supabase_db_olympus
docker logs supabase_auth_olympus
docker logs supabase_storage_olympus

# Monitor resource usage
docker stats

# Check Docker system resources
docker system info

# View Supabase CLI version
npx supabase --version

# Update Supabase CLI
npm install -g supabase@latest
```

---

## When to Use Cloud vs Local Supabase

| Scenario           | Use Local                          | Use Cloud               |
| ------------------ | ---------------------------------- | ----------------------- |
| Integration tests  | ✅ (if Docker resources available) | ✅ (always works)       |
| Unit tests         | ❌ (use mocks)                     | ❌ (use mocks)          |
| Development        | ✅ (faster iteration)              | ⚠️ (costs API quota)    |
| CI/GitHub Actions  | ⚠️ (complex setup)                 | ✅ (simpler)            |
| Low memory machine | ❌ (won't start)                   | ✅ (no Docker required) |

---

## Next Steps

1. **Increase Docker memory to 6GB** (recommended)
2. **Restart Supabase**: `npx supabase stop && npx supabase start`
3. **Run tests**: `cd apps/api && poetry run pytest tests/integration/ -v`
4. **If still failing**: Use cloud Supabase (Solution 3)

---

## Related Documentation

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Docker Resource Limits](https://docs.docker.com/desktop/settings/mac/#resources)
- [PostgreSQL Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
