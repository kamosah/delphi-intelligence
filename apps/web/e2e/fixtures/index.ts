/**
 * Main fixtures export for Olympus E2E tests.
 *
 * Composes all fixture layers:
 * - Supawright fixtures (supabase, supaService)
 * - Auth fixtures (authenticatedPage, authenticatedUserId)
 * - SSE Mock fixtures (mockSSE) - for testing without OpenAI credits
 *
 * Import from this file in your tests:
 * ```typescript
 * import { test, expect } from '@/e2e/fixtures';
 *
 * test('my test', async ({ authenticatedPage, supaService }) => {
 *   // Test with authenticated page and service client
 * });
 * ```
 *
 * For tests requiring SSE mocking (to avoid API credits):
 * ```typescript
 * import { test, expect } from '@/e2e/fixtures/sse-mock';
 *
 * test('streaming test', async ({ authenticatedPage, mockSSE }) => {
 *   await mockSSE({ responseText: 'Mock AI response' });
 *   // Test streaming without consuming OpenAI credits
 * });
 * ```
 */

// Re-export composed test with all fixtures
export { test, expect } from './auth';

// Re-export fixture types for type safety
export type { SupawrightFixtures } from './supawright';

// Re-export SSE mock utilities
export { createMockSSEResponse, createMockSSEError } from './sse-mock';
export type { MockSSEConfig } from './sse-mock';
