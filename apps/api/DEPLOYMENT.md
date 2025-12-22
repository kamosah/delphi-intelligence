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
