import { withSupawright } from 'supawright';
import type { Database as GeneratedDatabase } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase credentials. Ensure .env.test is configured with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
}

/**
 * Database type for Supawright.
 * Omits the __InternalSupabase property from the generated Database type
 * to make it compatible with Supawright's GenericDatabase constraint.
 */
type Database = Omit<GeneratedDatabase, '__InternalSupabase'>;

/**
 * Playwright test with Supawright integration.
 *
 * Extends Playwright's test with Supawright fixtures for automatic
 * database test data management and cleanup.
 *
 * Features:
 * - Automatic test data creation based on foreign key constraints
 * - Smart data generation (enums, types, etc.)
 * - Auto-cleanup after each test
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../lib/supawright';
 *
 * test('my test', async ({ page, supawright }) => {
 *   // Create test data
 *   const user = await supawright.create('users', {
 *     email: 'test@example.com'
 *   });
 *
 *   // Test operations...
 *   // Cleanup happens automatically
 * });
 * ```
 *
 * Note: Currently configured for 'public' schema only.
 * To add more schemas, update both the type parameter and array argument.
 */
export const test = withSupawright<Database, 'public'>(['public'], {
  supabase: {
    supabaseUrl,
    serviceRoleKey,
  },
});

export { expect } from '@playwright/test';
