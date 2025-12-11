# Test Project Setup Guide

This guide covers the manual steps required to complete Phase 2 of the Playwright test migration (LOG-233).

## Overview

Phase 2 sets up a dedicated Supabase test project with production schema parity for E2E testing with Playwright and Supawright.

## Prerequisites

- Access to Supabase dashboard (https://supabase.com/dashboard)
- Access to GitHub repository settings (for adding secrets)
- Supabase CLI installed (optional, for schema migration)

## Step 1: Create Supabase Test Project

### Manual Steps via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Configure project:
   - **Name**: `Olympus Test`
   - **Database Password**: Generate a strong password (save to 1Password)
   - **Region**: US West (or same as production)
   - **Pricing Plan**: Free
4. Click "Create new project" and wait for provisioning (~2 minutes)
5. Once created, save the following credentials to 1Password:
   - Project URL
   - Anon (public) key
   - Service role (secret) key
   - Project ID

### Get Project Credentials

From the Supabase project settings:

1. Navigate to **Settings** → **API**
2. Copy the following values:
   - **URL**: `https://[project-ref].supabase.co`
   - **Anon key**: `eyJhbGc...` (starts with eyJ)
   - **Service role key**: `eyJhbGc...` (starts with eyJ)
3. Navigate to **Settings** → **General**
4. Copy **Reference ID** (this is your project ID)

## Step 2: Copy Production Schema to Test Project

### Option A: Using Supabase CLI (Recommended)

```bash
# Export production schema
npx supabase db dump --db-url "$SUPABASE_URL" > schema.sql

# Import to test project
psql "$TEST_SUPABASE_URL" < schema.sql
```

### Option B: Using Supabase MCP Server

If you have the Supabase MCP server configured (see `apps/api/MIGRATION_AUTOMATION.md`):

```bash
# List production migrations
# Get production project ID from production .env

# Apply each migration to test project
# Repeat for all migrations
```

### Option C: Manual Migration (if CLI unavailable)

1. In production project: Go to **Database** → **Migrations**
2. Copy each migration SQL
3. In test project: Go to **SQL Editor**
4. Paste and run each migration in order

### Verify Schema Migration

After migrating, verify tables exist in test project:

1. Go to **Table Editor**
2. Confirm all tables are present:
   - `users`
   - `organizations`
   - `organization_members`
   - `spaces`
   - `space_members`
   - `documents`
   - `document_chunks`
   - `threads`
   - `messages`

## Step 3: Update Local Environment Variables

1. Open `apps/web/.env.test`
2. Replace placeholder values with actual credentials from Step 1:

```bash
# Supabase Test Project
NEXT_PUBLIC_SUPABASE_URL=https://[actual-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Actual anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Actual service role key

# Backend Test API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Test-specific flags
CI=false
NODE_ENV=test
CLEANUP_TEST_USERS=false
```

3. **IMPORTANT**: Verify `.env.test` is in `.gitignore` (it should be)
4. Test local setup:

```bash
cd apps/web
npm install  # Install Supawright
npm run test:e2e:ui  # Run Playwright in UI mode
```

## Step 4: Add GitHub Secrets for CI

### Required Secrets

Add the following secrets to your GitHub repository:

1. Go to **Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret" for each:

| Secret Name                      | Value                               | Description                   |
| -------------------------------- | ----------------------------------- | ----------------------------- |
| `TEST_SUPABASE_URL`              | `https://[project-ref].supabase.co` | Test project URL              |
| `TEST_SUPABASE_ANON_KEY`         | `eyJhbGc...`                        | Test project anon key         |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...`                        | Test project service role key |
| `TEST_SUPABASE_PROJECT_ID`       | `[project-ref]`                     | Test project reference ID     |

### Verify Secrets

After adding secrets, verify they're configured:

1. Go to **Actions** → **Secrets** → **Repository secrets**
2. Confirm all 4 secrets are listed (values are hidden)

## Step 5: Verify Setup

### Local Verification

```bash
# Install dependencies
cd apps/web
npm install

# Run a simple E2E test
npm run test:e2e:headed

# Expected: Tests should connect to Supabase test project
```

### CI Verification

1. Push changes to trigger CI
2. Check GitHub Actions workflow
3. Verify E2E tests can access test project

## Troubleshooting

### "Invalid API key" error

- Double-check keys are from the **test project**, not production
- Ensure no extra spaces when copying keys
- Verify keys in `.env.test` match Supabase dashboard

### Schema migration failed

- Check PostgreSQL version compatibility
- Verify all dependencies (extensions) are available in test project
- Try manual migration approach (Option C)

### Tests can't connect to Supabase

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check firewall/network settings
- Ensure test project is active (not paused)

## Security Notes

- ✅ `.env.test` is gitignored (never commit credentials)
- ✅ GitHub secrets are encrypted and only accessible to workflows
- ✅ Service role key should only be used in server-side code
- ✅ Test project should have separate credentials from production

## Next Steps

After completing these steps, you're ready for **Phase 3: E2E Infrastructure - Supawright Integration**.

See the main plan: `/Users/kwameamosah/.claude/plans/toasty-sauteeing-balloon.md`
