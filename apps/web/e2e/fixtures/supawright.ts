import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase credentials. Ensure .env.test is configured with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY'
  );
}

/**
 * Fixture type definitions
 */
export type SupawrightFixtures = {
  /**
   * Supabase client with anon key (subject to RLS policies).
   * Use for testing RLS enforcement and user-level operations.
   */
  supabase: SupabaseClient;

  /**
   * Supabase client with service role key (bypasses RLS).
   * Use for test setup, seeding data, and cleanup.
   */
  supaService: SupabaseClient;
};

/**
 * Supawright fixtures for E2E tests.
 *
 * Provides two Supabase clients:
 * - `supabase`: Anon client (RLS-aware) for testing user operations
 * - `supaService`: Service role client (bypasses RLS) for test setup/teardown
 *
 * Usage:
 * ```typescript
 * test('my test', async ({ supabase, supaService }) => {
 *   // Setup data with service role (bypasses RLS)
 *   const { data: org } = await supaService
 *     .from('organizations')
 *     .insert({ name: 'Test Org' })
 *     .select()
 *     .single();
 *
 *   // Test with anon client (respects RLS)
 *   const { data: spaces } = await supabase
 *     .from('spaces')
 *     .select('*')
 *     .eq('organization_id', org.id);
 * });
 * ```
 */
export const test = base.extend<SupawrightFixtures>({
  supabase: async ({}, use) => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await use(client);
  },

  supaService: async ({}, use) => {
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await use(client);
  },
});

export { expect } from '@playwright/test';
