# Render Backend Deployment - Step-by-Step Guide

Quick-start guide for deploying the Olympus FastAPI backend to Render.

> **Prerequisite**: Complete [Supabase Setup](./SUPABASE_SETUP.md) first to obtain database credentials.
>
> **For comprehensive troubleshooting**: See [`apps/api/DEPLOYMENT.md`](../apps/api/DEPLOYMENT.md)

---

## Overview

This guide walks through deploying the FastAPI backend to Render with the following stack:

- **Web Service**: FastAPI + Uvicorn (Docker)
- **Database**: Supabase PostgreSQL (connection pooling)
- **Cache/Sessions**: Render Redis (free tier)
- **Cost**: Free tier available ($0/month with limitations)

**Deployment Time**: ~15 minutes

---

## Before You Begin

Ensure you have:

- ✅ Supabase project created (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- ✅ Database connection string (session pooler)
- ✅ Supabase API keys (anon, service role, JWT secret)
- ✅ OpenAI API key (for embeddings and AI features)
- ✅ GitHub repository with code pushed
- ✅ Generated JWT secret: `openssl rand -hex 32`

---

## Step 1: Create Render Account

1. Go to https://dashboard.render.com/register
2. Sign up with GitHub (recommended for easy repo access)
3. Verify your email address
4. Complete account setup

**Free Tier Includes**:

- 750 hours/month web service (enough for 1 always-on service)
- Web service sleeps after 15 min inactivity
- 25MB Redis (free add-on)

---

## Step 2: Create Web Service

### 2.1 New Web Service

1. From Render dashboard, click **"New +"** → **"Web Service"**
2. Click **"Build and deploy from a Git repository"**
3. Click **"Connect account"** (if not already connected to GitHub)
4. Search for your repository: `kamosah/olympus` (or your fork)
5. Click **"Connect"**

### 2.2 Configure Service Settings

Fill in the web service configuration form:

**Basic Settings**:

- **Name**: `olympus-api` (or your preferred name)
  - This becomes your URL: `https://olympus-api.onrender.com`
- **Region**: Choose closest to your users
  - **Oregon (US West)** - Best for West Coast
  - **Ohio (US East)** - Best for East Coast
  - **Frankfurt (Europe)** - Best for EU
- **Branch**: `feat/vercel-deployment` (or `main` after merging)
- **Root Directory**: `apps/api`
  - ⚠️ **CRITICAL**: Must be set to `apps/api` for monorepo
- **Environment**: **Docker**
- **Dockerfile Path**: `apps/api/Dockerfile.prod`
  - Relative to repository root

**Instance Type**:

- **Free** ($0/month):
  - 512 MB RAM, 0.5 CPU
  - Sleeps after 15 min inactivity
  - ~30 second cold start
  - Good for demos/testing
- **Starter** ($7/month):
  - Always-on, no cold starts
  - Recommended for production

**Advanced Settings** (leave defaults):

- **Auto-Deploy**: Yes (deploys on git push)
- **Health Check Path**: `/health` (matches our health endpoint)
- **Start Command**: Defined in Dockerfile

### 2.3 Create Service

1. Click **"Create Web Service"** (at bottom of page)
2. Render will start building your Docker image
3. **Wait 5-10 minutes** for initial build
4. Monitor build logs in real-time

**Build Steps**:

1. Clone repository
2. Build Docker image (multi-stage build)
3. Install Python dependencies via Poetry
4. Start Uvicorn server
5. Run health checks

---

## Step 3: Add Redis Add-on

While the web service is building, add Redis for session management and caching.

### 3.1 Create Redis Instance

**From Render Dashboard** (recommended method):

1. Go to your main Render dashboard (click the Render logo in top-left)
2. Click **"New +"** → **"Redis"**
3. This opens the Redis creation form

**Configure Redis Settings**:

- **Name**: `olympus-redis` (or use auto-generated name)
- **Region**: **Must match your web service region** ⚠️
  - Critical for low latency
  - Example: If web service is in Oregon, Redis must be in Oregon
- **Plan**: **Free** (25 MB)
  - Sufficient for JWT session caching
  - Shared instance, not persistent across restarts
  - **Upgrade to Starter ($10/month)** for:
    - 1GB persistent storage
    - Dedicated instance
    - Better performance

4. Click **"Create Redis"**
5. Wait ~30 seconds for Redis to provision

**Alternative Method**: From within your web service, go to **"Environment"** tab → look for **"Add Database"** or **"Redis"** option (UI may vary).

### 3.2 Connect Redis to Web Service

After Redis is created, Render automatically configures the connection:

1. Go back to your **web service** (olympus-api)
2. Click **"Environment"** tab (left sidebar)
3. Scroll through environment variables
4. Verify `REDIS_URL` exists:
   - **Key**: `REDIS_URL`
   - **Value**: `redis://red-xxxxx:6379` (auto-populated by Render)

**If `REDIS_URL` is missing** (rare):

1. Go to your Redis instance → copy the **Internal Connection String**
2. Return to web service → **Environment** tab
3. Click **"Add Environment Variable"**
4. Add:
   - **Key**: `REDIS_URL`
   - **Value**: Paste the connection string from Redis instance

**Verify Connection**:

- After deployment completes, check logs for:
  ```
  INFO: Redis connection successful
  ```
- If you see Redis connection errors, verify the region matches your web service

---

## Step 4: Configure Environment Variables

In your web service, go to **"Environment"** tab.

### 4.1 Core Application Settings

Add these variables one by one:

| Key        | Value         | Notes                              |
| ---------- | ------------- | ---------------------------------- |
| `ENV`      | `production`  | Sets production mode               |
| `DEBUG`    | `false`       | Disables /docs, /redoc endpoints   |
| `PORT`     | `8000`        | Default port (Render auto-detects) |
| `APP_NAME` | `Olympus API` | Optional, for logging              |
| `HOST`     | `0.0.0.0`     | Allow external connections         |

### 4.2 Database Configuration (Supabase)

| Key                         | Value                                                                                             | Notes                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`              | `postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` | ⚠️ Use session pooler, NOT direct connection |
| `SUPABASE_URL`              | `https://[PROJECT-REF].supabase.co`                                                               | From Supabase Settings → API                 |
| `SUPABASE_ANON_KEY`         | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx`                                                      | Anon (public) key                            |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx`                                                      | Service role key (keep secret)               |

**How to get these**:

1. Go to your Supabase project → **Settings** → **API**
2. Copy Project URL → `SUPABASE_URL`
3. Copy anon public key → `SUPABASE_ANON_KEY`
4. Copy service_role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Get DATABASE_URL from **Settings** → **Database** → **Connection string** → **Session mode**

### 4.3 CORS Configuration

| Key                 | Value                                 | Notes                                |
| ------------------- | ------------------------------------- | ------------------------------------ |
| `CORS_ORIGIN_REGEX` | _(leave empty for production)_        | Disable regex matching in production |
| `CORS_ORIGINS`      | `["https://olympus-demo.vercel.app"]` | Add your Vercel URL (exact match)    |

**IMPORTANT**: After deploying frontend to Vercel, come back and update `CORS_ORIGINS` with your actual Vercel URL.

### 4.4 JWT Authentication

| Key                    | Value                     | Notes                                |
| ---------------------- | ------------------------- | ------------------------------------ |
| `JWT_SECRET`           | `<random-32-char-string>` | Generate with `openssl rand -hex 32` |
| `JWT_ALGORITHM`        | `HS256`                   | Default algorithm                    |
| `JWT_EXPIRATION_HOURS` | `24`                      | 24 hours (1 day)                     |

**Generate JWT_SECRET**:

```bash
openssl rand -hex 32
```

### 4.5 OpenAI Configuration

| Key                           | Value                    | Notes                                     |
| ----------------------------- | ------------------------ | ----------------------------------------- |
| `OPENAI_API_KEY`              | `sk-proj-xxxxx`          | From https://platform.openai.com/api-keys |
| `OPENAI_EMBEDDING_MODEL`      | `text-embedding-3-small` | Default embedding model                   |
| `OPENAI_EMBEDDING_BATCH_SIZE` | `100`                    | Max 100 per API call                      |
| `OPENAI_MAX_RETRIES`          | `3`                      | Retry failed API calls                    |
| `OPENAI_CHAT_MODEL`           | `gpt-4-turbo-preview`    | AI agent model                            |
| `OPENAI_TEMPERATURE`          | `0.0`                    | Deterministic responses                   |
| `OPENAI_MAX_TOKENS`           | `2000`                   | Max response length                       |

### 4.6 Redis Configuration

**This should already be configured** if you completed Step 3.

| Key         | Value                    | Notes                                          |
| ----------- | ------------------------ | ---------------------------------------------- |
| `REDIS_URL` | `redis://red-xxxxx:6379` | Auto-populated by Render when Redis is created |

**Verify Redis Connection**:

1. Check that `REDIS_URL` exists in your environment variables
2. Format should be: `redis://red-[unique-id]:6379`
3. The `red-xxxxx` portion is auto-generated by Render
4. **Do not modify** this value - Render manages it automatically

**If missing**: Return to Step 3.2 to manually add the Redis connection string.

### 4.7 SpiceDB Authorization (Optional)

**Only needed if you're deploying SpiceDB for fine-grained authorization** (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) Phase 5.5).

| Key                | Value                                | Notes                                       |
| ------------------ | ------------------------------------ | ------------------------------------------- |
| `SPICEDB_TOKEN`    | `<random-base64-string>`             | Generate with `openssl rand -base64 32`     |
| `SPICEDB_ENDPOINT` | `olympus-spicedb.onrender.com:50051` | Your SpiceDB service URL (without https://) |

**Generate SPICEDB_TOKEN**:

```bash
openssl rand -base64 32
```

**Note**: `SPICEDB_ENDPOINT` should be the internal Render service URL (not HTTPS). If deploying SpiceDB as a separate Render service, use the service's internal hostname.

**SpiceDB Synchronization Notes**:

- **Webhook authentication**: The `/webhooks/spicedb-sync` endpoint uses `SUPABASE_SERVICE_ROLE_KEY` (already configured above) for authentication
- **Supabase extensions** (pg_net, pg_cron): Optional for async synchronization, **NOT available on free tier**
  - Free tier: Use synchronous sync (default, no extra config needed)
  - Pro tier ($25/month): Can enable pg_net webhook triggers for async processing
  - See [`apps/api/DEPLOYMENT.md`](../apps/api/DEPLOYMENT.md) Step 6 for extension setup details

**Skip this** unless you're implementing RBAC/ReBAC authorization features with SpiceDB.

### 4.8 LangSmith (Optional - for AI observability)

| Key                    | Value                | Notes                           |
| ---------------------- | -------------------- | ------------------------------- |
| `LANGCHAIN_TRACING_V2` | `false`              | Set to `true` to enable tracing |
| `LANGCHAIN_API_KEY`    | _(leave empty)_      | Only if tracing enabled         |
| `LANGCHAIN_PROJECT`    | `olympus-production` | Project name in LangSmith       |

**Skip this** unless you're using LangSmith for debugging AI agents.

### 4.9 Review Environment Variables

After adding all variables, you should have **~20-22 environment variables** (depending on whether SpiceDB and LangSmith are enabled). Double-check:

- ✅ No quotes around values (Render doesn't need them)
- ✅ `DATABASE_URL` uses session pooler (`.pooler.supabase.com`)
- ✅ `CORS_ORIGINS` is a JSON array: `["https://..."]`
- ✅ All sensitive keys (JWT_SECRET, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are unique
- ✅ No placeholder values like `xxxxx` remain

---

## Step 5: Deploy

### 5.1 Trigger Deployment

If the initial build hasn't completed:

- Wait for it to finish (check "Events" tab for progress)

If you added environment variables after the build:

1. Go to **"Manual Deploy"** → **"Deploy latest commit"**
2. Or just push a new commit to trigger auto-deploy

### 5.2 Monitor Deployment

Watch the build logs:

1. Click **"Logs"** tab
2. Look for these success indicators:
   ```
   ==> Building image for apps/api...
   ==> Deploying...
   ==> Running health check...
   ==> Health check passed
   ==> Your service is live 🎉
   ```

**Build time**: 5-10 minutes (first build), 2-3 minutes (subsequent builds with cache)

### 5.3 Check for Errors

Common build errors:

- **"Dockerfile not found"**: Check Root Directory is `apps/api`
- **"Database connection failed"**: Verify `DATABASE_URL` format
- **"Health check failed"**: Check logs for startup errors

---

## Step 6: Verify Deployment

### 6.1 Get Your Service URL

Your backend URL will be:

```
https://olympus-api.onrender.com
```

(Or `https://[your-service-name].onrender.com`)

### 6.2 Test Health Endpoint

Open in browser or use curl:

```bash
curl https://olympus-api.onrender.com/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "olympus-api",
  "version": "0.1.0",
  "environment": "production"
}
```

### 6.3 Test GraphQL Endpoint

**Note**: GraphQL playground is disabled in production (`DEBUG=false`). Test via curl:

```bash
curl -X POST https://olympus-api.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

Expected response:

```json
{
  "data": {
    "__typename": "Query"
  }
}
```

### 6.4 Check Service Status

In Render dashboard:

1. Go to your web service
2. Status should show **"Live"** (green indicator)
3. Click **"Logs"** to verify:
   - No error messages
   - `Application startup complete`
   - `Uvicorn running on http://0.0.0.0:8000`

---

## Step 7: Update CORS for Frontend

After deploying frontend to Vercel (Phase 6), come back and update CORS:

1. Go to your web service → **"Environment"** tab
2. Find `CORS_ORIGINS` variable
3. Click **"Edit"** and update to:
   ```
   ["https://olympus-demo.vercel.app"]
   ```
   (Replace with your actual Vercel URL)
4. Click **"Save Changes"**
5. Render will automatically restart the service

---

## Important Notes

### Free Tier Limitations

- **Service sleeps after 15 minutes** of inactivity
- **Cold start time**: ~30 seconds for first request after sleep
- **Solution**: Upgrade to Starter tier ($7/month) for always-on

### Cold Start Impact

When service is sleeping:

1. First request takes 30-60 seconds (while spinning up)
2. User sees loading state in frontend
3. Subsequent requests are fast

**For demo/interview**:

- "Wake up" the service by visiting the health endpoint before showing the demo
- Or upgrade to paid tier for always-on behavior

### Database Connection Pooling

- **Critical**: Use session pooler connection string (`.pooler.supabase.com`)
- Direct connection strings don't work from Render
- Session mode is required for SQLAlchemy async

### Environment Variable Changes

After changing environment variables:

- Render automatically restarts the service
- Takes ~30 seconds to apply changes
- Check logs to verify successful restart

---

## Troubleshooting

For detailed troubleshooting, see [`apps/api/DEPLOYMENT.md`](../apps/api/DEPLOYMENT.md).

### Quick Fixes

**"Service Unavailable"**:

1. Check logs for errors
2. Verify DATABASE_URL format
3. Test health endpoint

**"CORS errors" in frontend**:

1. Add exact frontend URL to CORS_ORIGINS
2. No trailing slashes
3. Restart service

**"Database connection failed"**:

1. Use session pooler (not direct connection)
2. Verify password has no special characters
3. Test connection with psql

**"Health check failed"**:

1. Verify PORT=8000
2. Check Dockerfile.prod has EXPOSE 8000
3. Ensure health endpoint returns 200

---

## Next Steps

✅ **Backend deployed successfully!**

Continue to:

1. **Phase 6**: [Deploy Frontend to Vercel](../apps/web/README.md)
2. **Phase 7**: Integration testing and documentation

---

## Cost Breakdown

### Free Tier (Current Setup)

- Web Service: $0/month (with sleep after 15 min)
- Redis: $0/month (25MB)
- Supabase: $0/month (500MB database)
- OpenAI: Pay-per-use (~$0-5/month for light usage)

**Total: $0-5/month**

### Recommended Production

- Web Service: $7/month (Starter - always-on)
- Redis: $10/month (1GB persistent)
- Supabase: $25/month (Pro - 8GB database)
- OpenAI: ~$20-50/month (moderate usage)

**Total: ~$62-92/month**

---

---

## Optional: Deploy SpiceDB Authorization Service

**When to deploy**: Only if you're implementing fine-grained authorization with SpiceDB (LOG-246, LOG-250, LOG-251, LOG-252)

**Skip this** if you're using basic RBAC with direct database queries.

### SpiceDB Deployment Overview

SpiceDB requires its own service since it's a separate authorization server. We'll deploy it as:

- **Service Type**: Private Service (gRPC, not web)
- **Image**: `authzed/spicedb:latest`
- **Database**: Shared with main app (Supabase PostgreSQL)
- **Cost**: $7/month (Starter tier - always-on required for auth)

### Step 1: Create SpiceDB Private Service

1. From Render dashboard, click **"New +"** → **"Private Service"**
2. Choose **"Deploy an existing image from a registry"**
3. Configure:
   - **Image URL**: `authzed/spicedb:v1.48.0` (pinned version)
   - **Name**: `olympus-spicedb`
   - **Region**: **Must match your main web service region** ⚠️

### Step 2: Configure SpiceDB Service

**Instance Type**:

- **Starter** ($7/month) - **Required**, Free tier doesn't work for gRPC services
- SpiceDB must be always-on for authorization checks

**Environment Variables**:

Add these in the SpiceDB service's Environment tab:

| Key                          | Value                                                                                                     | Notes                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `SPICEDB_GRPC_PRESHARED_KEY` | `<random-base64-string>`                                                                                  | Generate with `openssl rand -base64 32` |
| `SPICEDB_DATASTORE_CONN_URI` | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require` | Transaction pooler (port **6543**)      |

**Generate SPICEDB_GRPC_PRESHARED_KEY**:

```bash
openssl rand -base64 32
```

**CRITICAL - Connection String Format**:

- ✅ Correct: `postgresql://` (standard PostgreSQL driver)
- ❌ Wrong: `postgresql+asyncpg://` (Python SQLAlchemy dialect - SpiceDB won't parse this)
- Use port **6543** (Transaction pooler), not 5432 (Direct connection)
- Must include `?sslmode=require` at the end

**Important**: Use the same database as your main FastAPI app. SpiceDB will create its own tables (prefixed with `_spicedb_`).

### Step 3: Configure Start Command

**CRITICAL**: SpiceDB won't start without the correct command.

In the SpiceDB service settings, add this **Start Command**:

```bash
spicedb serve --grpc-preshared-key=$SPICEDB_GRPC_PRESHARED_KEY --datastore-engine=postgres --datastore-conn-uri=$SPICEDB_DATASTORE_CONN_URI --grpc-shutdown-grace-period=1s --grpc-addr=0.0.0.0:50051 --http-enabled --http-addr=0.0.0.0:8443 --log-level=trace
```

**Explanation**:

- `serve` - Start the SpiceDB permissions server
- `--grpc-preshared-key=$SPICEDB_GRPC_PRESHARED_KEY` - Authentication token (from env var)
- `--datastore-engine=postgres` - Use PostgreSQL backend (hardcoded)
- `--datastore-conn-uri=$SPICEDB_DATASTORE_CONN_URI` - Supabase connection string (from env var)
- `--grpc-addr=0.0.0.0:50051` - Bind gRPC to all interfaces on port 50051 (TLS disabled by default)
- `--grpc-shutdown-grace-period=1s` - Fast graceful shutdown (hardcoded)
- `--http-enabled` - Enable HTTP gateway (for health checks and metrics)
- `--http-addr=0.0.0.0:8443` - HTTP/metrics endpoint on port 8443
- `--log-level=trace` - Enable maximum logging for troubleshooting (use `info` in production)

**Note**: Only sensitive/dynamic values use environment variables (`$VAR_NAME`). Stable values like engine type and timeouts are hardcoded for simplicity.

### Step 4: Configure Port and Health Check

In SpiceDB service settings:

- **Port**: `50051` (gRPC default)
- **Health Check Path**: `/healthz` (HTTP endpoint on port 8443)
  - Or leave empty if health checks fail (gRPC health checks are optional)

### Step 5: Run Database Migrations

**CRITICAL**: SpiceDB requires database migrations to create its tables before it can start accepting requests.

After the service is deployed (even if showing warnings), run migrations:

**Option 1: Using Render Shell (Recommended)**

1. Go to Render Dashboard → SpiceDB Service → **Shell** tab
2. Run this command:
   ```bash
   spicedb datastore migrate head --datastore-engine postgres --datastore-conn-uri "$SPICEDB_DATASTORE_CONN_URI"
   ```

**Option 2: Using Local zed CLI**

```bash
# Install zed CLI
brew install authzed/tap/zed

# Run migrations remotely
spicedb datastore migrate head \
  --datastore-engine postgres \
  --datastore-conn-uri "postgresql://postgres.zipeptuujmmhveektxwb:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

**Expected Output**:

When migrations complete successfully, you'll see:

```
{"level":"info","targetRevision":"head","message":"server already at requested revision"}
```

Or if running for the first time:

```
successfully migrated to revision "add-index-for-transaction-gc"
```

**Verify Migration Success**:

1. **Check migration status**:

   ```bash
   spicedb datastore migrate head --datastore-engine postgres --datastore-conn-uri "$SPICEDB_DATASTORE_CONN_URI"
   ```

   - Should show: `"server already at requested revision"` ✅

2. **Check SpiceDB service logs** (Render Dashboard → Logs):
   - ✅ `grpc server started serving` (no more "not migrated" warnings)
   - ✅ `http server started serving`
   - ✅ No more `relation "metadata" does not exist` errors

3. **Database verification** (optional):
   - Connect to your Supabase database
   - Verify tables exist: `alembic_version`, `namespace_config`, `relation_tuple`, `caveat`, etc.

**Important**: If you used a separate database for SpiceDB (recommended to avoid Alembic migration conflicts), update the `SPICEDB_DATASTORE_CONN_URI` environment variable in your Render SpiceDB service to point to the new database URL.

### Step 6: Get Internal Service URL

After SpiceDB deploys, Render provides an internal URL:

```
olympus-spicedb.onrender.com:50051
```

This is the value you'll use for `SPICEDB_ENDPOINT` in your main web service.

### Step 7: Update Main Web Service

Go back to your main web service (olympus-api) → **Environment** tab:

Add/update these variables:

| Key                | Value                                | Notes                                     |
| ------------------ | ------------------------------------ | ----------------------------------------- |
| `SPICEDB_TOKEN`    | `<same-token-from-step-2>`           | Must match `SPICEDB_GRPC_PRESHARED_KEY`   |
| `SPICEDB_ENDPOINT` | `olympus-spicedb.onrender.com:50051` | Internal Render service URL (no https://) |

**Critical**: The token must be identical in both services.

### Step 8: Upload Authorization Schema

After both services are deployed, upload your SpiceDB schema:

**Option 1: Using zed CLI (recommended)**

1. Install zed CLI:

   ```bash
   brew install authzed/tap/zed
   # or
   npm install -g @authzed/zed
   ```

2. Upload schema:
   ```bash
   zed schema write \
     --endpoint olympus-spicedb.onrender.com:50051 \
     --token <your-spicedb-token> \
     apps/api/app/policies/olympus.zed
   ```

**Option 2: Using API endpoint**

From your deployed backend, SpiceDB service handles schema uploads automatically on startup (if configured in your FastAPI startup logic).

### Step 9: Verify SpiceDB Connection

Check logs in your main web service:

```
INFO: SpiceDB SecureClient initialized (endpoint: olympus-spicedb.onrender.com:50051, TLS: enabled)
```

If you see connection errors:

1. Verify both services are in the same region
2. Check token matches in both services
3. Ensure SpiceDB service is **running** (not sleeping)

### SpiceDB Deployment Checklist

- [ ] SpiceDB private service created in same region as main app
- [ ] SPICEDB_GRPC_PRESHARED_KEY generated and added to SpiceDB service
- [ ] SPICEDB_DATASTORE_CONN_URI uses same Supabase database (correct format: `postgresql://`, port 6543, `?sslmode=require`)
- [ ] Start command configured with valid SpiceDB flags
- [ ] **Database migrations run** via `spicedb datastore migrate head` (CRITICAL)
- [ ] Internal service URL copied to main app as SPICEDB_ENDPOINT
- [ ] Same token added to main app as SPICEDB_TOKEN
- [ ] Authorization schema uploaded via zed CLI
- [ ] Connection verified in main app logs

### Cost Impact

**With SpiceDB**:

- Main Web Service: $7/month (Starter)
- SpiceDB Private Service: $7/month (Starter)
- Redis: $10/month (recommended for production)
- Supabase: $25/month (Pro)

**Total: ~$69-99/month** (production setup)

### Troubleshooting SpiceDB

**"failed to create datastore" errors**:

If you see: `failed to create datastore: failed to create primary datastore: unable to instantiate datastore`

1. **Check the SPICEDB_DATASTORE_CONN_URI format**:
   - **CRITICAL**: Must use `postgresql://` prefix, NOT `postgresql+asyncpg://`
   - The `+asyncpg` dialect is for Python SQLAlchemy only - SpiceDB won't accept it
   - Correct format: `postgresql://user:password@host:port/database?sslmode=require`
   - Example: `postgresql://postgres.abc123:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`

2. **Verify Supabase connection settings**:
   - Use the **Transaction pooler** (port **6543**), not Direct connection (port 5432)
   - Include `?sslmode=require` at the end
   - **DO NOT copy** the Python/SQLAlchemy connection string (it has `+asyncpg`)
   - Get the string from Supabase Dashboard → Settings → Database → Connection String → **Transaction**
   - Manually change `postgresql+asyncpg://` to `postgresql://` if you copied the Python version

3. **Check SpiceDB logs with trace level**:
   - The start command includes `--log-level=trace` for maximum visibility
   - Look for detailed error messages about the connection failure
   - Common issues: wrong password, wrong host, SSL mode mismatch, missing `sslmode=require`

**"datastore is not migrated" warnings**:

If you see: `datastore failed readiness checks: datastore is not migrated: currently at revision "b1dca76ce116", but requires "add-index-for-transaction-gc"`

1. **Run database migrations** (see Step 5 above):

   ```bash
   spicedb datastore migrate head --datastore-engine postgres --datastore-conn-uri "$SPICEDB_DATASTORE_CONN_URI"
   ```

2. **This is expected** on first deployment - SpiceDB needs to create its tables

3. **Symptoms before migration**:
   - `relation "metadata" does not exist`
   - `relation "relation_tuple_transaction" does not exist`
   - Service keeps retrying readiness checks

4. **After successful migration**:
   - Warnings stop appearing
   - Service shows `grpc server started serving`
   - Health checks pass

**"Connection refused" errors**:

- Ensure SpiceDB service is running (check Events tab)
- Verify both services in same region
- Check port 50051 is correct

**"Permission denied" errors**:

- Verify tokens match exactly

**"unable to find migration for revision" errors**:

If you see: `unable to find migration for revision: b1dca76ce116` or similar Alembic errors:

1. **Root cause**: SpiceDB uses Alembic for migrations (same as Python API)
   - If your database already has an `alembic_version` table from Python/FastAPI migrations
   - SpiceDB will fail because it has different migration revisions

2. **Solution**: Use a **separate database** for SpiceDB (recommended):
   - Create a new Supabase project or database for SpiceDB only
   - Update `SPICEDB_DATASTORE_CONN_URI` to point to the new database
   - Run SpiceDB migrations on the clean database
   - This keeps Python API and SpiceDB migrations isolated

3. **Verification**:
   - Check your database for `alembic_version` table
   - If version is `b1dca76ce116` or other Python revision → use separate database
   - Fresh SpiceDB database should have revision like `add-index-for-transaction-gc`

- No extra whitespace in token values
- Token must be base64-encoded

**"Schema not found" errors**:

- Upload schema using zed CLI
- Verify schema file path is correct
- Check logs for schema write errors

**"Database connection failed"**:

- Use same Supabase connection string as main app
- Verify `?sslmode=require` is in connection string
- Test database connection from main app first

**For SpiceDB Sync Monitoring and Outbox Troubleshooting**:

See [`apps/api/DEPLOYMENT.md`](../apps/api/DEPLOYMENT.md) for:

- **SpiceDB Synchronization Monitoring** section - Admin endpoints (`/admin/outbox/stats`, `/admin/outbox/process`)
- **Troubleshooting** subsections - Outbox processing failures, webhook authentication, missing ZedTokens

---

**Created**: 2024-12-20
**Updated**: 2024-12-27
**For**: Olympus Backend Deployment
**Phase**: 5 of 7 (Render Deployment)
