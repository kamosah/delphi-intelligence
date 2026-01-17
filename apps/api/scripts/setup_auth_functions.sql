-- Setup auth schema and functions for Supabase RLS testing
-- This script creates the auth.uid() function that RLS policies depend on
-- Run this script during test database initialization

CREATE SCHEMA IF NOT EXISTS auth;

-- Create PostgreSQL roles used by Supabase RLS
-- These roles are required for SET ROLE commands in RLS-aware sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END
$$;

-- Grant privileges to current user to assume these roles
-- Replace 'test' with actual database user if different
GRANT authenticated TO CURRENT_USER;
GRANT anon TO CURRENT_USER;
GRANT service_role TO CURRENT_USER;

-- auth.uid() returns the user ID from JWT claims
-- RLS policies use this function to filter data by authenticated user
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

-- auth.jwt() returns the full JWT claims as JSONB
-- Useful for accessing additional claims like role, email, etc.
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb,
    '{}'::jsonb
  )
$$;

-- auth.role() returns the user's role from JWT claims
-- Useful for role-based RLS policies
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )
$$;

COMMENT ON FUNCTION auth.uid() IS 'Returns the user UUID from JWT claims (PostgreSQL session variable). Used by RLS policies to filter data by authenticated user.';
COMMENT ON FUNCTION auth.jwt() IS 'Returns the full JWT claims as JSONB from PostgreSQL session variable.';
COMMENT ON FUNCTION auth.role() IS 'Returns the user role from JWT claims. Useful for role-based RLS policies.';
