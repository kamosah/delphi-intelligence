# Quick Start: Fix RLS Warnings in Supabase

**Time required**: ~5 minutes
**Warnings to fix**: 2 (user_preferences, alembic_version)

---

## ⚡ Quick Fix (Recommended)

### Step 1: Run SQL Script in Supabase Dashboard

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Copy the contents of `fix_rls_warnings.sql`
4. Paste into SQL Editor
5. Click **"Run"**

✅ **Done!** Both warnings will be fixed.

### Step 2: Verify Changes

Go to **Database** → **Advisors** and refresh. You should see:

- ✅ `user_preferences` warning: **RESOLVED**
- ✅ `alembic_version` warning: **RESOLVED**

---

## 📋 What the Script Does

### For `user_preferences`:

- ✅ Enables Row Level Security
- ✅ Creates 5 policies:
  - Users can read own preferences
  - Users can insert own preferences
  - Users can update own preferences
  - Users can delete own preferences
  - Service role has full access

### For `alembic_version`:

- ✅ Creates `_internal` schema
- ✅ Moves table from `public` to `_internal`
- ✅ Removes from PostgREST exposure

---

## 🔧 Backend Configuration (Already Done)

The `alembic/env.py` file has been updated to use `_internal` schema:

```python
# Already configured in apps/api/alembic/env.py
context.configure(
    version_table_schema="_internal",  # ✅ Already set
    # ... other config
)
```

No further action needed!

---

## ✅ Verification Steps

### Check RLS is Enabled

```sql
-- Run in Supabase SQL Editor
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_preferences'
  AND schemaname = 'public';
```

Expected: `rls_enabled = true`

### Check Policies Exist

```sql
SELECT
    policyname
FROM pg_policies
WHERE tablename = 'user_preferences'
  AND schemaname = 'public';
```

Expected: 5 policies listed

### Check alembic_version Location

```sql
SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_name = 'alembic_version';
```

Expected: `table_schema = _internal`

---

## 🚨 Troubleshooting

### "Table user_preferences does not exist"

The table might not be created yet. Run migrations first:

```bash
cd apps/api
docker compose up -d
docker compose exec api poetry run alembic upgrade head
```

Then run the SQL script.

### "Schema \_internal already exists"

This is fine! The script uses `CREATE SCHEMA IF NOT EXISTS`, so it's idempotent.

### "Policy already exists"

The script drops existing policies before creating new ones, so it's safe to run multiple times.

### Warnings still appear after running

1. Wait 1-2 minutes for Supabase to refresh
2. Go to **Database** → **Advisors**
3. Click **"Refresh"** or reload the page
4. Warnings should be gone

---

## 📚 Additional Resources

- **Detailed Guide**: See `RLS_SECURITY_FIXES.md` for in-depth explanation
- **SQL Script**: `fix_rls_warnings.sql` (the actual fix)
- **Migration**: `alembic/versions/20251015_101814_enable_rls_on_user_preferences.py`
- **Supabase Docs**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🎯 Summary

| Issue                              | Fix                        | Status                |
| ---------------------------------- | -------------------------- | --------------------- |
| `user_preferences` RLS disabled    | Enable RLS + 5 policies    | ✅ SQL script ready   |
| `alembic_version` in public schema | Move to `_internal` schema | ✅ SQL script ready   |
| Alembic config                     | Add `version_table_schema` | ✅ Already configured |

**Total time**: ~5 minutes to run SQL script and verify

**Impact**:

- 🔒 Enhanced security (RLS enforced)
- ✅ Linter warnings resolved
- 🚀 No breaking changes to application
