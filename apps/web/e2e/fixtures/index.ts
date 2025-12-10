/**
 * Composed Playwright fixtures for Olympus E2E testing
 *
 * This file combines all individual fixtures into a single export for convenience.
 * Import from here to get access to all fixtures in one test.
 *
 * @example
 * ```typescript
 * import { test, expect } from '@/e2e/fixtures';
 *
 * test('complex test with all fixtures', async ({
 *   authenticatedPage,
 *   graphqlMocker,
 *   authenticatedAPI,
 *   sseClient,
 * }) => {
 *   // Use any combination of fixtures
 * });
 * ```
 */

import { test as base, expect as baseExpect } from '@playwright/test';
import { test as apiTest } from './api';
import { test as authTest } from './auth';
import { test as graphqlTest } from './graphql';
import { test as sseTest } from './sse';

/**
 * Composed test fixture with all utilities
 *
 * Available fixtures:
 * - `authenticatedPage` - Page with per-worker authentication
 * - `graphqlMocker` - GraphQL operation mocking
 * - `authenticatedAPI` - REST API client with Olympus JWT
 * - `sseClient` - SSE/EventSource testing utilities
 */
export const test = base
  .extend(authTest)
  .extend(graphqlTest)
  .extend(apiTest)
  .extend(sseTest);

/**
 * Re-export expect from Playwright
 */
export const expect = baseExpect;

/**
 * Re-export individual fixture classes for advanced usage
 */
export { GraphQLMocker } from './graphql';
export { AuthenticatedAPIClient, getSupabaseTokenFromPage } from './api';
export { SSETestClient, type SSEEvent, type SSEEventType } from './sse';
export { setupAuthMocks, authenticateAs } from './auth';

/**
 * Type definitions for all fixtures
 */
export type {
  // Re-export Playwright types
  Page,
  BrowserContext,
  APIRequestContext,
  Locator,
  Response,
} from '@playwright/test';
