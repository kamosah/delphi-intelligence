import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Setup mock API route handlers for Supabase + Olympus hybrid auth
 *
 * TODO: Implement mocking for:
 * - Supabase authentication endpoints (signInWithPassword, signUp, etc.)
 * - Olympus client token exchange endpoint
 * - GraphQL queries (me, etc.)
 */
export async function setupAuthMocks(page: Page) {
  // TODO: Implement auth mocks for new Supabase hybrid auth flow
}

/**
 * Test fixture with auth mocks
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Setup mocks before each test
    await setupAuthMocks(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
