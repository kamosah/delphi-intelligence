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

While the web service is building, add Redis:

### 3.1 Create Redis Instance

1. In your web service dashboard, click **"Settings"** tab (left sidebar)
2. Scroll to **"Environment"** section
3. Click **"Add Environment Variable"** is NOT what we want - look for **"Add-ons"**
4. Actually, let's go back to the main dashboard:
   - Click **"New +"** → **"Redis"**
   - OR in your web service, go to **"Environment"** tab → **"Add Database"** → **"Redis"**

### 3.2 Configure Redis

- **Name**: `olympus-redis` (or auto-generated)
- **Region**: **Same as your web service** (critical for low latency)
- **Plan**: **Free** (25 MB, sufficient for sessions)
  - Shared instance, not persistent across restarts
  - Upgrade to Starter ($10/month) for 1GB persistent Redis

### 3.3 Connect Redis to Web Service

1. After creating Redis, go back to your web service
2. Go to **"Environment"** tab
3. Render should auto-populate `REDIS_URL` environment variable
   - Format: `redis://red-xxxxx:6379`
4. If not, manually add:
   - Key: `REDIS_URL`
   - Value: Copy from Redis instance details

---

## Step 4: Configure Environment Variables

In your web service, go to **"Environment"** tab.

### 4.1 Core Application Settings

Add these variables one by one:

| Key        | Value             | Notes                              |
| ---------- | ----------------- | ---------------------------------- |
| `ENV`      | `production`      | Sets production mode               |
| `DEBUG`    | `false`           | Disables /docs, /redoc endpoints   |
| `PORT`     | `8000`            | Default port (Render auto-detects) |
| `APP_NAME` | `Olympus MVP API` | Optional, for logging              |
| `HOST`     | `0.0.0.0`         | Allow external connections         |

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

### 4.6 Redis (Auto-populated)

| Key         | Value                    | Notes                           |
| ----------- | ------------------------ | ------------------------------- |
| `REDIS_URL` | `redis://red-xxxxx:6379` | Auto-set by Render Redis add-on |

**Verify**: Should already exist if you added Redis in Step 3.

### 4.7 LangSmith (Optional - for AI observability)

| Key                    | Value                | Notes                           |
| ---------------------- | -------------------- | ------------------------------- |
| `LANGCHAIN_TRACING_V2` | `false`              | Set to `true` to enable tracing |
| `LANGCHAIN_API_KEY`    | _(leave empty)_      | Only if tracing enabled         |
| `LANGCHAIN_PROJECT`    | `olympus-production` | Project name in LangSmith       |

**Skip this** unless you're using LangSmith for debugging AI agents.

### 4.8 Review Environment Variables

After adding all variables, you should have **~20 environment variables**. Double-check:

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

**Created**: 2024-12-20
**For**: Olympus MVP Backend Deployment
**Phase**: 5 of 7 (Render Deployment)
