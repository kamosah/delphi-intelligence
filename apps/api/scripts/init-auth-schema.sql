-- ============================================================================
-- Supabase Auth Schema Initialization
-- ============================================================================
-- This script creates the auth schema and helper functions required for
-- Row Level Security (RLS) policies to work with Supabase-compatible auth.
--
-- Automatically executed when PostgreSQL container starts via:
--   /docker-entrypoint-initdb.d/01-auth-schema.sql
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- Create auth schema for Supabase compatibility
CREATE SCHEMA IF NOT EXISTS auth;

-- Create _internal schema for Alembic version tracking
CREATE SCHEMA IF NOT EXISTS _internal;

-- ============================================================================
-- auth.uid() - Returns authenticated user's UUID from JWT claim
-- ============================================================================
-- This function extracts the user's UUID from the JWT token set by PostgREST
-- or manually set in tests via current_setting().
--
-- How it works:
--   1. PostgREST/tests set: current_setting('request.jwt.claim.sub', true)
--   2. Or full JWT: current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
--   3. Returns UUID or NULL if not authenticated
--
-- Used in RLS policies like:
--   CREATE POLICY "select_own_threads"
--   ON threads FOR SELECT
--   TO authenticated
--   USING (owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));
-- ============================================================================
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

-- ============================================================================
-- auth.role() - Returns current PostgreSQL role from JWT or session
-- ============================================================================
-- Returns the authenticated role from JWT claim or falls back to current_user.
--
-- Possible values:
--   - 'authenticated' - Regular logged-in user
--   - 'anon' - Unauthenticated/anonymous user
--   - 'service_role' - Bypasses RLS (admin/service account)
--
-- Used in RLS policies for defense-in-depth:
--   CREATE POLICY "service_role_only"
--   ON sensitive_table FOR ALL
--   TO service_role
--   USING (auth.role() = 'service_role');
-- ============================================================================
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    current_user
  )::text;
$$;

-- ============================================================================
-- Create PostgreSQL Roles for RLS Policies
-- ============================================================================
-- These roles are required for Supabase RLS policies to work correctly.
-- RLS policies use "TO <role>" to specify which role the policy applies to.
--
-- Role hierarchy:
--   anon:            Unauthenticated users (no JWT token)
--   authenticated:   Logged-in users (valid JWT token)
--   service_role:    Bypasses ALL RLS policies (BYPASSRLS privilege)
-- ============================================================================
DO $$
BEGIN
  -- Anonymous role (unauthenticated users)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  -- Authenticated role (logged-in users)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  -- Service role (bypasses RLS for admin operations)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

-- ============================================================================
-- Grant Permissions to Supabase Roles
-- ============================================================================
-- Allow all three roles to access the public schema and its objects.
-- This ensures RLS policies can evaluate queries from all role types.
-- ============================================================================

-- Schema-level permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Table permissions (existing tables)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Sequence permissions (for auto-increment columns)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Function permissions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- Set Default Privileges for Future Objects
-- ============================================================================
-- Ensure new tables/sequences/functions automatically grant permissions
-- to Supabase roles. Without this, migrations that create new tables would
-- require manual GRANT statements.
--
-- IMPORTANT: Must specify "FOR ROLE postgres" so privileges apply to objects
-- created by Alembic migrations (which run as postgres user).
-- ============================================================================
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ============================================================================
-- Grant Role Assumption to postgres User
-- ============================================================================
-- Allow the postgres superuser to assume these roles for testing.
-- Required for RLS test fixtures to switch roles via "SET LOCAL ROLE".
-- ============================================================================
GRANT anon, authenticated, service_role TO postgres;

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON SCHEMA auth IS 'Supabase Auth helper functions for RLS policies';
COMMENT ON FUNCTION auth.uid() IS 'Returns authenticated user UUID from JWT claim (compatible with Supabase)';
COMMENT ON FUNCTION auth.role() IS 'Returns current PostgreSQL role from JWT or session (compatible with Supabase)';

-- ============================================================================
-- Verification Query (for testing)
-- ============================================================================
-- After running this script, you can verify auth functions exist:
--
--   docker compose exec postgres psql -U postgres -d olympus_dev -c "SELECT auth.uid(), auth.role();"
--
-- Expected output:
--   uid | role
--  -----+----------
--       | postgres
--
-- (NULL uid because no JWT set, role defaults to 'postgres' user)
-- ============================================================================
