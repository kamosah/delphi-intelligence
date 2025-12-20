# Supabase Production Setup Guide

This guide walks through setting up a production Supabase PostgreSQL database for the Olympus MVP platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Create Supabase Project](#step-1-create-supabase-project)
- [Step 2: Enable Connection Pooling](#step-2-enable-connection-pooling)
- [Step 3: Run Database Migrations](#step-3-run-database-migrations)
- [Step 4: Collect Credentials](#step-4-collect-credentials)
- [Step 5: Verify Setup](#step-5-verify-setup)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)
- [Cost Considerations](#cost-considerations)

---

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- GitHub account (for OAuth login to Supabase)
- Database migration files ready in `apps/api/alembic/versions/`
- OpenSSL installed (for generating secrets)

---

## Step 1: Create Supabase Project

### 1.1 Navigate to Supabase Dashboard

1. Go to https://supabase.com
2. Sign in with GitHub
3. Click **"New Project"** in the dashboard

### 1.2 Configure Project Settings

Fill in the project creation form:

- **Organization**: Select your organization (or create a new one)
- **Name**: `olympus-production` (or your preferred name)
- **Database Password**: **CRITICAL** - Generate a strong password
  - Use a password manager or run: `openssl rand -base64 32`
  - **Save this password immediately** - you cannot retrieve it later
  - Store securely in your password manager or secrets vault
- **Region**: Choose the region closest to your users
  - **US East (N. Virginia)** - `us-east-1` (recommended for US users)
  - **EU (Frankfurt)** - `eu-central-1` (recommended for EU users)
  - **Asia Pacific (Singapore)** - `ap-southeast-1` (recommended for Asia users)
- **Pricing Plan**: Free (sufficient for MVP, includes 500MB database + 50MB file storage)

### 1.3 Create Project

1. Click **"Create new project"**
2. Wait 2-3 minutes for project provisioning
3. You'll see a success message when ready

---

## Step 2: Enable Connection Pooling

**Why Connection Pooling?** Render and other cloud platforms open many connections. Connection pooling prevents exhausting PostgreSQL's connection limit (default 100 connections).

### 2.1 Navigate to Database Settings

1. In Supabase dashboard, click **"Database"** in left sidebar
2. Click **"Connection Pooling"** tab

### 2.2 Enable Session Pooler

Connection pooling is **already enabled by default** in Supabase. You need to copy the correct connection string:

1. Under **"Connection String"**, select **"Session mode"**
   - **Session mode**: For SQLAlchemy, Django, and most ORMs (recommended)
   - **Transaction mode**: For serverless functions and short-lived connections
2. Connection string format:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
3. Copy this connection string - you'll need it for `DATABASE_URL` environment variable

### 2.3 Verify Connection Pooler

- **Port**: Should be `5432` (session pooler port)
- **Host**: Should end with `.pooler.supabase.com`
- **Max connections**: 100 (Free tier default)

⚠️ **IMPORTANT**: Always use the **session pooler** connection string for production deployments. Direct connection strings (port `6543`) are not accessible from external services.

---

## Step 3: Run Database Migrations

You have two options for running migrations: **Supabase SQL Editor** (recommended for initial setup) or **Alembic** (for ongoing development).

### Option A: Supabase SQL Editor (Recommended)

**Best for**: Initial production setup, one-time schema deployment

1. Navigate to **"SQL Editor"** in Supabase dashboard
2. Click **"+ New Query"**
3. Copy all migration SQL from `apps/api/alembic/versions/`
   - Open each migration file (e.g., `001_initial_schema.py`)
   - Copy the SQL from the `upgrade()` function
4. Paste into SQL Editor
5. Click **"Run"** to execute
6. Verify success in the **"Success"** tab

**Example**:

```sql
-- Paste your migration SQL here
CREATE TABLE spaces (...);
CREATE TABLE documents (...);
-- ... rest of your schema
```

### Option B: Alembic (For Development/CI)

**Best for**: Ongoing development, automated deployments, CI/CD pipelines

#### 3.1 Update Local Environment

Create a temporary `.env.migration` file in `apps/api/`:

```env
# Use session pooler connection string
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

#### 3.2 Run Migrations via Docker

From **project root**:

```bash
cd apps/api

# Load migration environment variables
export $(cat .env.migration | xargs)

# Run migrations
docker compose exec api poetry run alembic upgrade head
```

#### 3.3 Verify Migrations

Check migration status:

```bash
docker compose exec api poetry run alembic current
```

Expected output:

```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
<your-latest-migration-hash> (head)
```

### Option C: Supabase MCP Server (Advanced)

**Best for**: Production-grade workflow with migration tracking

If you have the Supabase MCP server configured (see `apps/api/MIGRATION_AUTOMATION.md`):

```bash
# Apply migration via MCP
mcp supabase apply-migration \
  --project-id <YOUR_PROJECT_ID> \
  --name "initial_schema" \
  --query "$(cat alembic/versions/001_initial_schema.sql)"
```

---

## Step 4: Collect Credentials

You'll need these credentials for deployment. Collect them from the Supabase dashboard:

### 4.1 Project URL

1. Navigate to **"Settings"** → **"API"**
2. Copy **"Project URL"**
   - Format: `https://[PROJECT-REF].supabase.co`
   - Example: `https://abcdefghijklmno.supabase.co`
   - Used for: `SUPABASE_URL` environment variable

### 4.2 API Keys

Still in **"Settings"** → **"API"**:

1. **Anon (public) key**:
   - Copy **"anon public"** key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx`
   - **Safe to expose** in frontend code
   - Used for: `SUPABASE_ANON_KEY`

2. **Service role (secret) key**:
   - Copy **"service_role"** key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx`
   - **MUST be kept secret** - never expose in frontend
   - Used for: `SUPABASE_SERVICE_ROLE_KEY`

### 4.3 JWT Secret

Still in **"Settings"** → **"API"**:

1. Scroll to **"JWT Settings"**
2. Copy **"JWT Secret"**
   - Format: Long random string
   - **MUST be kept secret**
   - Used for: `SUPABASE_JWT_SECRET`

### 4.4 Database Password

- The password you created in Step 1.2
- If you lost it, you can reset it:
  1. **"Settings"** → **"Database"**
  2. Click **"Reset Database Password"**
  3. **WARNING**: Resetting will break existing connections

### 4.5 Database URL (Session Pooler)

From Step 2.2, your session pooler connection string:

```
postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**IMPORTANT**: Replace `[PASSWORD]` with your actual database password, and ensure it uses `postgresql+asyncpg://` prefix for SQLAlchemy async support.

---

## Step 5: Verify Setup

### 5.1 Test Database Connection

Use Supabase SQL Editor to verify tables were created:

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Expected tables:

- `spaces`
- `documents`
- `document_chunks`
- `queries`
- `messages`
- `users`
- `alembic_version` (if using Alembic)

### 5.2 Check pgvector Extension

Verify pgvector extension is enabled (required for vector search):

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

If not enabled, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5.3 Verify Connection Pooling

Test the connection pooler endpoint from your local machine:

```bash
# Install psql if not already installed
# macOS: brew install postgresql

# Test connection (replace with your actual values)
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

Successful connection will show:

```
psql (15.x)
Type "help" for help.

postgres=>
```

Type `\q` to exit.

---

## Security Checklist

Before deploying to production, verify:

- ✅ Strong database password (32+ characters, generated securely)
- ✅ Database password stored in password manager or secrets vault
- ✅ `SUPABASE_SERVICE_ROLE_KEY` never exposed to frontend
- ✅ `SUPABASE_JWT_SECRET` never committed to git
- ✅ Using **session pooler** connection string (not direct connection)
- ✅ Connection string uses `postgresql+asyncpg://` prefix for async support
- ✅ Row Level Security (RLS) policies enabled on all tables
- ✅ API keys rotated if accidentally exposed
- ✅ Database backups enabled (automatic on Supabase)
- ✅ SSL/TLS enforced for all connections (default on Supabase)

---

## Troubleshooting

### "Could not connect to server"

**Issue**: Cannot connect to database from local machine or deployment platform

**Solutions**:

1. Verify you're using the **session pooler** connection string (`.pooler.supabase.com`)
2. Check database password is correct (no special characters causing URL encoding issues)
3. Ensure connection string uses `postgresql+asyncpg://` (not `postgresql://`)
4. Verify project is not paused (Supabase pauses inactive projects on Free tier after 1 week)

### "Peer authentication failed"

**Issue**: Authentication error when connecting

**Solutions**:

1. Double-check database password
2. Reset database password in **Settings** → **Database** if forgotten
3. Ensure connection string format is correct

### "Too many connections"

**Issue**: Exceeded connection limit

**Solutions**:

1. Verify using connection pooler (not direct connection)
2. Check SQLAlchemy pool configuration in `apps/api/app/db/session.py`
3. Consider upgrading to Pro tier for 500 connections (vs 100 on Free tier)

### Migration Fails: "relation already exists"

**Issue**: Tables already exist in database

**Solutions**:

1. If running migrations multiple times, use: `alembic downgrade base` then `alembic upgrade head`
2. For fresh start, drop all tables in SQL Editor:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
3. Re-run migrations

### pgvector Extension Not Found

**Issue**: `ERROR: type "vector" does not exist`

**Solutions**:

1. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. Verify version: Supabase includes pgvector by default on all projects

---

## Cost Considerations

### Free Tier Limits (as of 2024)

- **Database**: 500 MB storage
- **File Storage**: 50 MB (for document uploads)
- **Bandwidth**: 5 GB/month
- **Max Connections**: 100 (with connection pooling)
- **Pausing**: Projects pause after 1 week of inactivity
- **Backups**: Daily backups retained for 7 days

### When to Upgrade to Pro ($25/month)

- Database storage > 500 MB (Pro: 8 GB included)
- Need guaranteed uptime (Free tier projects pause after 1 week inactivity)
- More than 100 concurrent connections (Pro: 500 connections)
- Need point-in-time recovery (Pro: 7-day PITR)
- Longer backup retention (Pro: 30 days)

### Monitoring Usage

1. Navigate to **"Settings"** → **"Usage"**
2. Monitor:
   - Database size (check weekly)
   - API requests (check for abuse)
   - Bandwidth (ensure within limits)

---

## Next Steps

After completing this setup:

1. ✅ Save all credentials securely (password manager or `.env.production` locally)
2. ✅ Document credentials in `apps/api/.env.production.example` (without actual values)
3. ✅ Continue to **Phase 5: Deploy Backend to Render** (see `apps/api/DEPLOYMENT.md`)
4. ✅ Configure environment variables in Render dashboard using collected credentials
5. ✅ Test backend connection to Supabase before deploying frontend

---

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Connection Pooling Guide**: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- **pgvector Documentation**: https://supabase.com/docs/guides/ai/vector-columns
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Alembic Documentation**: https://alembic.sqlalchemy.org/

---

**Created**: 2024-12-20
**For**: Olympus MVP Production Deployment
**Phase**: 4 of 7 (Supabase Setup)
