/**
 * Main fixtures export for Olympus E2E tests.
 *
 * Composes all fixture layers:
 * - Supawright fixtures (supabase, supaService)
 * - Auth fixtures (authenticatedPage, authenticatedUserId)
 *
 * Import from this file in your tests:
 * ```typescript
 * import { test, expect } from '@/e2e/fixtures';
 *
 * test('my test', async ({ authenticatedPage, supaService }) => {
 *   // Test with authenticated page and service client
 * });
 * ```
 */

// Re-export composed test with all fixtures
export { test, expect } from './auth';

// Re-export fixture types for type safety
export type { SupawrightFixtures } from './supawright';
