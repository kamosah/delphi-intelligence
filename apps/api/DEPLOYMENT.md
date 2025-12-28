# Olympus API - Deployment Guide

This guide covers deploying the Olympus FastAPI backend to production platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deploying to Render](#deploying-to-render)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Project**: Production database with connection pooling enabled
2. **OpenAI API Key**: For document embeddings and AI features
3. **Git Repository**: Code pushed to GitHub
4. **Render Account**: Free tier works for demo/testing

---

## Environment Configuration

### Required Environment Variables

Copy `.env.production.example` to `.env` and configure all values:

```bash
# Core
ENV=production
DEBUG=false
PORT=8000

# Database (Supabase session pooler - required!)
DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Supabase
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Redis (auto-populated by Render add-on)
REDIS_URL=redis://red-xxxxx:6379

# CORS (add your frontend URL)
CORS_ORIGINS=["https://olympus-demo.vercel.app"]

# JWT (generate random secret)
JWT_SECRET=$(openssl rand -hex 32)

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx
```

### Generating Secure Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate 32-character random string
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Deploying to Render

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `olympus-api`
   - **Region**: Oregon (US West) or closest to users
   - **Branch**: `main` or `feat/vercel-deployment`
   - **Root Directory**: `apps/api`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `apps/api/Dockerfile.prod`
   - **Instance Type**: Free (or upgrade for always-on)

### Step 2: Add Redis Add-on

1. In your web service dashboard, go to "Settings"
2. Scroll to "Add-ons" → Click "Add"
3. Select "Redis" → Choose plan (Free tier: 25MB)
4. Click "Create Redis"
5. Render auto-populates `REDIS_URL` environment variable

### Step 3: Configure Environment Variables

In the "Environment" tab, add all variables from `.env.production.example`:

```bash
ENV=production
DEBUG=false
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
CORS_ORIGINS=["https://olympus-demo.vercel.app"]
JWT_SECRET=<generate-with-openssl-rand-hex-32>
OPENAI_API_KEY=sk-proj-xxxxx
```

**IMPORTANT**: Do NOT include quotes around environment variable values in Render dashboard.

### Step 4: Deploy

1. Click "Create Web Service"
2. Render automatically:
   - Builds Docker image from `Dockerfile.prod`
   - Pulls dependencies
   - Starts application on port 8000
   - Runs health checks

Deployment takes ~5-10 minutes.

### Step 5: Verify Deployment

Once deployed, check:

```bash
# Health endpoint
curl https://olympus-api.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "service": "olympus-api",
  "version": "0.1.0",
  "environment": "production"
}
```

---

## Database Setup (Supabase)

### Step 1: Create Production Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Configure:
   - **Name**: `olympus-production`
   - **Database Password**: Strong password (save securely!)
   - **Region**: Same as Render service (e.g., US East)
   - **Pricing Plan**: Free tier works for demos

### Step 2: Enable Connection Pooling

1. In project dashboard, go to "Settings" → "Database"
2. Scroll to "Connection Pooling"
3. Enable "Session" mode (required for SQLAlchemy)
4. Copy the connection string:
   ```
   postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
5. Add to Render environment variables as `DATABASE_URL`

### Step 3: Run Database Migrations

Option A: Via Supabase SQL Editor (Recommended)

1. Go to "SQL Editor" in Supabase dashboard
2. Copy migration SQL from `apps/api/alembic/versions/*.py`
3. Execute each migration in order

Option B: Via Alembic (requires Supabase connection from local machine)

```bash
# Set DATABASE_URL to production
export DATABASE_URL="postgresql+asyncpg://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Run migrations
cd apps/api
docker compose exec api poetry run alembic upgrade head
```

### Step 4: Verify Database

```sql
-- In Supabase SQL Editor
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- Should show tables: users, organizations, spaces, documents, etc.
```

### Step 5: SpiceDB Synchronization Migrations (Optional)

If deploying with SpiceDB authorization, run these additional migrations:

**Migration 1: Create Outbox Table**
```sql
-- File: 5c4c7c20e2bc_create_auth_sync_outbox_table.py
-- Creates auth_sync_outbox table for reliable SpiceDB synchronization
-- Includes event tracking, retry logic, and dead letter queue
```

**Migration 2: Add ZedToken Columns**
```sql
-- File: 34d2490c6293_add_zedtoken_columns.py
-- Adds zedtoken column to organizations and spaces tables
-- Enables read-your-writes consistency for synchronous permission writes
```

**Migration 3: Create Sync Triggers**
```sql
-- File: 548de4f77dae_create_spicedb_sync_triggers.py
-- Creates PostgreSQL triggers on:
--   - organizations (INSERT, DELETE)
--   - organization_members (INSERT, UPDATE, DELETE)
--   - spaces (INSERT, DELETE)
--   - space_members (INSERT, DELETE)
--   - documents (INSERT, DELETE)
-- Automatically populates auth_sync_outbox when authorization data changes
```

**Apply migrations**:
```bash
# Via Alembic (local to production Supabase)
export DATABASE_URL="postgresql+asyncpg://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
poetry run alembic upgrade head

# Or via Supabase SQL Editor
# Copy SQL from migration files and execute in dashboard
```

**Verification**:
```sql
-- Check outbox table exists
SELECT COUNT(*) FROM auth_sync_outbox;

-- Check ZedToken columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'organizations' AND column_name = 'zedtoken';

-- Check triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table IN ('organizations', 'organization_members', 'spaces', 'space_members', 'documents');
```

### Step 6: Optional PostgreSQL Extensions for Async Sync

**Note**: The following extensions enable **asynchronous** SpiceDB synchronization via webhooks. This is **optional** - synchronous sync works without these extensions.

#### pg_net (Webhook Triggers)

**Purpose**: Fires HTTP webhooks from PostgreSQL after data changes

**Availability**:
- ❌ **NOT available** on Supabase free tier
- ✅ **Available** on Supabase Pro tier ($25/month)

**Configuration** (if available):

1. Enable pg_net extension in Supabase dashboard:
   - Settings → Database → Extensions
   - Search "pg_net" → Enable

2. Configure webhook URL (Supabase SQL Editor):
   ```sql
   -- Set webhook URL (Render backend)
   INSERT INTO public.pg_net_config (url)
   VALUES ('https://olympus-api.onrender.com/webhooks/spicedb-sync');
   ```

3. Verify triggers fire:
   ```sql
   -- Check trigger status
   SELECT * FROM information_schema.triggers
   WHERE trigger_name LIKE '%spicedb_sync%';
   ```

#### pg_cron (Retry Processing)

**Purpose**: Scheduled jobs to retry failed outbox items

**Availability**:
- ❌ **NOT available** on Supabase free tier
- ✅ **Available** on Supabase Pro tier ($25/month)

**Configuration** (if available):

1. Enable pg_cron extension in Supabase dashboard:
   - Settings → Database → Extensions
   - Search "cron" → Enable

2. Create retry job (Supabase SQL Editor):
   ```sql
   -- Schedule outbox processing every 5 minutes
   SELECT cron.schedule(
     'process-auth-sync-outbox',
     '*/5 * * * *',  -- Every 5 minutes
     $$
     SELECT net.http_post(
       'https://olympus-api.onrender.com/admin/outbox/process',
       '{}',
       '{"Content-Type": "application/json"}'
     );
     $$
   );
   ```

3. Verify job scheduled:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-auth-sync-outbox';
   ```

#### Workaround Without Extensions

If using **Supabase free tier** (no pg_net/pg_cron), use **synchronous sync only**:

- All authorization changes write to SpiceDB immediately within the transaction
- No webhook triggers or outbox processing needed
- Slightly higher latency (~50-100ms) on write operations
- Simpler deployment (no webhook configuration)

**Configuration**: No changes needed - synchronous sync is the default in the codebase.

---

## Post-Deployment

### Update Frontend CORS

Add backend URL to allowed origins:

```bash
# In Render dashboard, update CORS_ORIGINS:
CORS_ORIGINS=["https://olympus-demo.vercel.app","https://olympus.yourdomain.com"]
```

### Monitor Logs

```bash
# Via Render dashboard
1. Go to your web service
2. Click "Logs" tab
3. Monitor for errors

# Look for:
✓ "Application startup complete"
✓ "Uvicorn running on http://0.0.0.0:8000"
✓ Health check responses: 200 OK
```

### Test GraphQL Endpoint

**Note**: GraphQL playground is disabled when `DEBUG=false`. Test via frontend or curl:

```bash
# Test GraphQL query
curl -X POST https://olympus-api.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### Performance Optimization

#### Free Tier Limitations:

- **Sleeps after 15 minutes** of inactivity
- **Cold start**: ~30 seconds for first request after sleep
- **Solution**: Upgrade to paid tier ($7/month) for always-on

#### Database Connection Pooling:

- **Session pooler** handles up to 200 concurrent connections
- **Transaction pooler** (alternative) for higher concurrency

---

## SpiceDB Synchronization Monitoring

After deploying with SpiceDB synchronization, use these endpoints to monitor sync health:

### Admin Endpoints

#### Get Outbox Statistics

```bash
curl https://olympus-api.onrender.com/admin/outbox/stats
```

**Response**:
```json
{
  "pending_count": 0,
  "processing_count": 0,
  "completed_count": 1234,
  "failed_count": 2,
  "dead_letter_count": 0,
  "oldest_pending": null,
  "newest_pending": null
}
```

#### Manual Processing

Trigger manual processing if automatic sync is disabled or delayed:

```bash
curl -X POST https://olympus-api.onrender.com/admin/outbox/process
```

**Response**:
```json
{
  "processed_count": 10,
  "success_count": 8,
  "failed_count": 2,
  "dead_letter_count": 0
}
```

#### Reprocess Dead Letters

Retry items that failed after max retries:

```bash
curl -X POST https://olympus-api.onrender.com/admin/outbox/reprocess-dead-letters \
  -H "Content-Type: application/json" \
  -d '{"item_ids": ["uuid1", "uuid2"]}'
```

**Or reprocess all dead letters**:
```bash
curl -X POST https://olympus-api.onrender.com/admin/outbox/reprocess-dead-letters \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Monitoring Guidelines

**Key metrics to monitor**:

1. **Pending Count** - Should remain low (<100)
   - High count indicates webhook processing lag
   - Action: Check FastAPI logs for errors

2. **Failed Count** - Should be low (<5% of total)
   - Items waiting for retry
   - Action: Review `last_error` field in database

3. **Dead Letter Count** - Should be near zero
   - Items that exceeded 5 retry attempts
   - Action: Manual investigation required (data issue or SpiceDB connectivity)

4. **Processing Latency** - Target <1 second (p95)
   - Time from DB commit to SpiceDB write
   - Measure: Compare `created_at` vs `processed_at` for completed items

**Alert thresholds** (recommended):

| Metric             | Warning | Critical | Action                        |
| ------------------ | ------- | -------- | ----------------------------- |
| Pending count      | >500    | >1000    | Check webhook endpoint health |
| Failed rate        | >5%     | >10%     | Investigate SpiceDB errors    |
| Dead letter count  | >10     | >50      | Manual review required        |
| Processing latency | >5s p95 | >10s p95 | Scale processor or check logs |

---

## Troubleshooting

### Issue: Health Check Fails

**Symptoms**: Render shows "Deploy failed" or "Service unavailable"

**Solution**:
1. Check logs for startup errors
2. Verify `DATABASE_URL` format (must use session pooler)
3. Ensure Redis is connected (check `REDIS_URL`)
4. Test health endpoint: `curl https://olympus-api.onrender.com/health`

### Issue: CORS Errors

**Symptoms**: Frontend shows "CORS policy" errors in browser console

**Solution**:
1. Verify `CORS_ORIGINS` includes exact frontend URL (with https://)
2. No trailing slashes in URLs
3. Restart service after updating environment variables

### Issue: Database Connection Errors

**Symptoms**: "Could not connect to database" in logs

**Solution**:
1. **Verify connection string format**: Must use `postgresql+asyncpg://` (not `postgresql://`)
2. **Use session pooler endpoint**: `aws-0-[region].pooler.supabase.com` (not direct database URL)
3. **Check password**: No special characters that need URL encoding
4. **Test connection**:
   ```bash
   # From local machine
   psql "postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   ```

### Issue: OpenAI API Errors

**Symptoms**: "OpenAI API key invalid" or rate limit errors

**Solution**:
1. Verify API key starts with `sk-proj-` (new format) or `sk-` (legacy)
2. Check OpenAI account has credits: https://platform.openai.com/account/billing
3. Reduce batch size if hitting rate limits: `OPENAI_EMBEDDING_BATCH_SIZE=50`

### Issue: Redis Connection Errors

**Symptoms**: "Could not connect to Redis" in logs

**Solution**:
1. Verify Redis add-on is created and running
2. Check `REDIS_URL` is populated (Render auto-sets this)
3. Redis must be in same region as web service

### Issue: Out of Memory Errors

**Symptoms**: "Out of memory (used over 512Mi)" during deployment or startup

**Root Cause**: Render's free tier has a 512MB memory limit. Memory can spike during:
- Poetry creating virtualenvs at runtime
- Heavy dependency loading (LangChain, OpenAI, PyMuPDF, NLTK)
- Multiple Uvicorn workers

**Solution**:

**Option 1: Optimized Dockerfile (Recommended)**
The latest `Dockerfile.prod` includes these optimizations:
1. **No Poetry at runtime**: Run `uvicorn` directly instead of `poetry run`
2. **Single worker**: Uses `--workers 1` for free tier
3. **No virtualenv creation**: Sets `POETRY_VIRTUALENVS_CREATE=false`

If using an older Dockerfile, update to the latest version or apply these changes manually.

**Option 2: Upgrade Instance Type**
If memory issues persist after optimization:
1. Go to Render dashboard → Your service → Settings
2. Scroll to "Instance Type"
3. Upgrade to **Starter ($7/month)** with 512MB+ RAM

**Verification**:
```bash
# Check logs for successful startup
docker logs <container-id> 2>&1 | grep "Uvicorn running"

# Should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started parent process [1]
```

### Issue: Outbox Processing Failures

**Symptoms**: High failed_count or dead_letter_count in `/admin/outbox/stats`

**Solution**:

1. **Check SpiceDB connectivity**:
   ```bash
   # From Render shell
   grpcurl -plaintext olympus-spicedb.onrender.com:50051 grpc.health.v1.Health/Check
   ```

2. **Review failed item errors**:
   ```sql
   -- In Supabase SQL Editor
   SELECT id, event_type, last_error, retry_count
   FROM auth_sync_outbox
   WHERE status = 'failed'
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

3. **Common error messages**:
   - `"Missing organization_id in event_data"` - Data validation issue, check trigger logic
   - `"SpiceDB connection refused"` - Verify SPICEDB_ENDPOINT and SPICEDB_TOKEN
   - `"Permission denied"` - Token mismatch, regenerate and update both services
   - `"Relationship already exists"` - Idempotency issue (safe to ignore)

4. **Reprocess specific items**:
   ```bash
   curl -X POST https://olympus-api.onrender.com/admin/outbox/reprocess-dead-letters \
     -H "Content-Type: application/json" \
     -d '{"item_ids": ["<uuid-from-database>"]}'
   ```

### Issue: Webhook Authentication Failures

**Symptoms**: 403 Forbidden errors in webhook endpoint logs

**Solution**:

1. Verify `SUPABASE_SERVICE_ROLE_KEY` environment variable is set correctly in Render
2. Check webhook payload includes valid `Authorization: Bearer <service-role-key>` header
3. Ensure service role key hasn't been rotated in Supabase dashboard

### Issue: Missing ZedTokens

**Symptoms**: Stale read warnings or inconsistent permission checks after writes

**Solution**:

1. Verify ZedToken migration applied:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'organizations' AND column_name = 'zedtoken';
   ```

2. Check ZedToken is being stored after synchronous writes:
   ```sql
   SELECT id, name, zedtoken FROM organizations WHERE zedtoken IS NOT NULL LIMIT 5;
   ```

3. If missing, re-run migration:
   ```bash
   poetry run alembic upgrade head
   ```

---

## Monitoring & Maintenance

### Health Checks

Render runs health checks every 30 seconds:

```bash
curl https://olympus-api.onrender.com/health
```

### Logs

View logs in Render dashboard or tail via CLI:

```bash
# Install Render CLI
npm install -g @render-com/cli

# Authenticate
render login

# Tail logs
render logs --service olympus-api
```

### Scaling

#### Horizontal Scaling (Multiple Instances):

- Available on paid plans ($7+/month)
- Recommended for high traffic

#### Vertical Scaling (More Resources):

- Upgrade instance type in Render dashboard
- Options: 512MB, 1GB, 2GB, 4GB+ RAM

---

## Security Checklist

Before going live:

- [ ] `DEBUG=false` (disables /docs, /redoc endpoints)
- [ ] Strong `JWT_SECRET` (32+ random characters)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` stored securely (never exposed to frontend)
- [ ] `DATABASE_URL` uses session pooler (not direct connection)
- [ ] `CORS_ORIGINS` restricted to your frontend domains only
- [ ] Environment variables in Render secrets (not in git)
- [ ] Supabase Row Level Security (RLS) enabled on all tables
- [ ] Database backups enabled in Supabase
- [ ] SSL/TLS enabled (Render does this automatically)

---

## Cost Summary

### Free Tier (Demo/Testing):

- **Render Web Service**: $0/month (sleeps after 15 min)
- **Render Redis**: $0/month (25MB)
- **Supabase**: $0/month (500MB database, 50MB storage)
- **OpenAI**: Pay-per-use (~$0.02 per 1M embedding tokens)

**Total**: ~$0-5/month (depending on OpenAI usage)

### Production Tier (Recommended):

- **Render Web Service**: $7/month (always-on, 512MB RAM)
- **Render Redis**: $10/month (1GB, persistent)
- **Supabase**: $25/month (Pro plan, 8GB database, 100GB storage)
- **OpenAI**: Variable (~$20-50/month for moderate usage)

**Total**: ~$62-92/month

---

## Next Steps

1. **Deploy Frontend**: See `apps/web/README.md` for Vercel deployment
2. **Configure Custom Domain**: Set up `api.olympus.com` via Render
3. **Set Up Monitoring**: Integrate Sentry or LogRocket for error tracking
4. **Enable HTTPS**: Render provides free SSL certificates
5. **Optimize Performance**: Upgrade instance or enable caching

---

## Support

For deployment issues:

- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **OpenAI Status**: https://status.openai.com/
- **Project Issues**: https://github.com/kamosah/olympus/issues

---

**Last Updated**: 2024-12-19
**Deployment Target**: Render + Supabase + Vercel
