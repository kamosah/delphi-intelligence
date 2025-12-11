import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase credentials. Ensure .env.test is configured with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY'
  );
}

/**
 * Anonymous Supabase client for user-facing operations.
 * Uses publishable key (safe for browser-side operations).
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service role Supabase client for test setup/teardown.
 * Uses secret key with elevated privileges (bypasses RLS).
 * Only use in test infrastructure, never in application code.
 */
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
