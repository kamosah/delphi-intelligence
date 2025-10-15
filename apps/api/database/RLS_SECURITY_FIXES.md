# RLS Security Fixes for Supabase Linter Warnings

This guide explains how to fix Row Level Security (RLS) warnings from Supabase's database linter.

## Understanding the Warnings

Supabase's linter detects tables in the `public` schema that don't have RLS enabled. This is a security risk because without RLS, any authenticated user could potentially access all data in those tables.

## Warning 1: `user_preferences` Table

### Issue

```
Table `public.user_preferences` is public, but RLS has not been enabled.
```

### Fix Applied

We've created a migration to enable RLS on the `user_preferences` table with appropriate policies.

**Migration file**: `20251015_101814_enable_rls_on_user_preferences.py`

**RLS Policies Created**:

1. **Read own preferences**: Users can only SELECT their own preferences
2. **Insert own preferences**: Users can only INSERT their own preferences
3. **Update own preferences**: Users can only UPDATE their own preferences
4. **Delete own preferences**: Users can only DELETE their own preferences
5. **Service role full access**: Backend (using `SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS

### How to Apply

#### Option 1: Using Alembic (Local Database)

```bash
cd apps/api

# Start Docker services
docker-compose up -d

# Apply migration
docker-compose exec api poetry run alembic upgrade head

# Verify
docker-compose exec api poetry run alembic current
```

#### Option 2: Using Supabase MCP (Supabase Cloud)

```bash
cd apps/api

# Use the Supabase MCP server to apply migration
# Claude Code will automatically use the mcp-supabase server
# The migration content from the file will be applied via MCP
```

#### Option 3: Manual SQL (Supabase Dashboard)

If you prefer to apply manually:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the following SQL:

```sql
-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read own preferences
CREATE POLICY "Users can read own preferences"
ON user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert own preferences
CREATE POLICY "Users can insert own preferences"
ON user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own preferences
CREATE POLICY "Users can update own preferences"
ON user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete own preferences
CREATE POLICY "Users can delete own preferences"
ON user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role full access
CREATE POLICY "Service role has full access to user_preferences"
ON user_preferences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

3. Click **Run**

## Warning 2: `alembic_version` Table

### Issue

```
Table `public.alembic_version` is public, but RLS has not been enabled.
```

### Why This is Different

The `alembic_version` table is a **system table** managed by Alembic for migration tracking. It should **NOT** have RLS enabled because:

- It contains only migration version information (no sensitive data)
- Alembic needs unrestricted access to manage migrations
- Enabling RLS could break the migration system

### Recommended Fix

There are two approaches to handle this warning:

#### Option 1: Move to a Different Schema (Recommended)

Move the `alembic_version` table to a non-public schema that's not exposed via PostgREST:

```sql
-- Create internal schema for system tables
CREATE SCHEMA IF NOT EXISTS _internal;

-- Move alembic_version table
ALTER TABLE public.alembic_version SET SCHEMA _internal;
```

**Update Alembic Configuration**:

Edit `apps/api/alembic.ini`:

```ini
# Add to [alembic] section
version_table_schema = _internal
```

Or in `apps/api/alembic/env.py`:

```python
# In run_migrations_online() function
with connectable.connect() as connection:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        version_table_schema='_internal',  # Add this line
    )
```

#### Option 2: Suppress the Warning (Less Secure)

If you want to keep it in the public schema and accept the risk:

1. Go to **Supabase Dashboard** → **Database** → **Linter**
2. Find the `alembic_version` warning
3. Click **"Suppress"** or **"Ignore"**

**⚠️ Not recommended**: This leaves a system table publicly accessible, though it only contains version strings.

#### Option 3: Enable Minimal RLS (Not Recommended)

You could enable RLS with a very permissive policy, but this defeats the purpose:

```sql
ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to alembic_version"
ON alembic_version
FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

**⚠️ Not recommended**: This adds overhead without real security benefit.

### Our Recommendation

**Use Option 1** (move to `_internal` schema). This is the cleanest solution:

1. ✅ Removes the table from public exposure
2. ✅ No RLS overhead on a system table
3. ✅ Alembic continues to work normally
4. ✅ Satisfies security linter

## Applying the `_internal` Schema Fix

### Step 1: Create the Schema and Move Table

Run in **Supabase SQL Editor**:

```sql
-- Create internal schema for system tables
CREATE SCHEMA IF NOT EXISTS _internal;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA _internal TO postgres, authenticated, service_role;

-- Move alembic_version table
ALTER TABLE public.alembic_version SET SCHEMA _internal;
```

### Step 2: Update Alembic Configuration

Edit `apps/api/alembic/env.py`:

```python
def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # ... existing code ...

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            version_table_schema='_internal',  # Add this line
        )

        with context.begin_transaction():
            context.run_migrations()
```

### Step 3: Test Migration System

```bash
cd apps/api
docker-compose up -d

# Verify Alembic can still see the version table
docker-compose exec api poetry run alembic current

# Expected output:
# 20251014_220000 (head)
```

## Verification

After applying fixes, verify in **Supabase Dashboard** → **Database** → **Advisors**:

### Expected Results

- ✅ `user_preferences` warning: **RESOLVED**
- ✅ `alembic_version` warning: **RESOLVED** (if using `_internal` schema)

### How to Check RLS is Enabled

```sql
-- Check which tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected for `user_preferences`:

- `rls_enabled`: `true`
- 5 policies listed

## Additional Security Best Practices

### All Application Tables Should Have RLS

Ensure these tables have RLS enabled:

- ✅ `users` - User accounts
- ✅ `spaces` - Workspaces
- ✅ `space_members` - Workspace memberships
- ✅ `documents` - Uploaded documents
- ✅ `queries` - AI queries
- ✅ `query_documents` - Query-document relationships
- ✅ `user_preferences` - User settings

### System Tables Can Skip RLS

These tables typically don't need RLS:

- `alembic_version` - Migration tracking (move to `_internal` schema)
- Any other Alembic or system tables

### Service Role Access

The backend uses `SUPABASE_SERVICE_ROLE_KEY` which:

- ✅ Bypasses RLS completely
- ✅ Has full database access
- ⚠️ Must be kept secret (never commit to git)
- ⚠️ Only use in backend code, never in frontend

## Troubleshooting

### "Policy does not exist" Error

If you get this error when running the downgrade:

```
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

The `IF EXISTS` clause should prevent errors, but if it still fails:

1. Check policy names match exactly (including quotes)
2. Verify table name is correct
3. Check schema is `public` (not specified in policy, defaults to public)

### "Permission denied for schema \_internal"

Grant proper permissions:

```sql
GRANT USAGE ON SCHEMA _internal TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA _internal TO postgres, service_role;
```

### "Alembic can't find version table"

After moving to `_internal` schema, verify config:

```python
# In alembic/env.py
context.configure(
    connection=connection,
    target_metadata=target_metadata,
    version_table_schema='_internal',  # Must be set
)
```

### "RLS policy blocks service role"

This shouldn't happen. Service role policies should always use:

```sql
CREATE POLICY "Service role full access"
ON table_name
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

## Summary

| Table              | Fix                        | Status                 |
| ------------------ | -------------------------- | ---------------------- |
| `user_preferences` | Enable RLS + 5 policies    | ✅ Migration created   |
| `alembic_version`  | Move to `_internal` schema | 📋 Manual SQL required |

**Next Steps**:

1. Apply the `user_preferences` migration
2. Move `alembic_version` to `_internal` schema
3. Update `alembic/env.py` configuration
4. Verify both warnings are resolved in Supabase Dashboard

---

**References**:

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Linter Guide](https://supabase.com/docs/guides/database/database-linter)
- [Alembic Version Table Configuration](https://alembic.sqlalchemy.org/en/latest/api/runtime.html#alembic.runtime.environment.EnvironmentContext.configure)
