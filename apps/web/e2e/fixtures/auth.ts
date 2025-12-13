import type { Page } from '@playwright/test';
import { test as base } from './supawright';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseProjectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseProjectId) {
  throw new Error(
    'Missing Supabase credentials. Ensure .env.test is configured with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_SUPABASE_PROJECT_ID'
  );
}

/**
 * Auth fixture type definitions
 */
type AuthFixtures = {
  /**
   * Page with authenticated user session.
   * Uses real Supabase authentication with HTTP-only cookies.
   * Each worker gets a unique test user (worker-0, worker-1, etc.)
   */
  authenticatedPage: Page;

  /**
   * User ID of the authenticated user.
   * Useful for RLS testing and data creation.
   */
  authenticatedUserId: string;
};

/**
 * Auth fixtures for E2E tests.
 *
 * Provides authenticated page context using real Supabase authentication.
 * Each test worker gets its own test user to prevent conflicts during parallel execution.
 *
 * Features:
 * - Real Supabase REST API authentication
 * - HTTP-only cookie management (simulates Supabase SSR)
 * - Per-worker isolation (worker-0@example.com, worker-1@example.com, etc.)
 * - Real Next.js middleware token exchange (Supabase → Olympus JWT)
 *
 * Usage:
 * ```typescript
 * test('my test', async ({ authenticatedPage, authenticatedUserId }) => {
 *   await authenticatedPage.goto('/spaces');
 *   // Page is already authenticated, cookies are set
 * });
 * ```
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, supaService }, use, testInfo) => {
    const workerIndex = testInfo.parallelIndex;
    const userEmail = `worker-${workerIndex}@example.com`;
    const userPassword = 'TestPassword123!';

    console.log(`🔐 Worker ${workerIndex}: Authenticating as ${userEmail}`);

    // 1. Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Fill in login form and submit
    await page.fill('[name="email"]', userEmail);
    await page.fill('[name="password"]', userPassword);
    await page.click('button[type="submit"]');

    // 3. Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 4. Verify authentication succeeded (check for app logo in dashboard)
    try {
      await page.getByTestId('app-logo').waitFor({
        state: 'visible',
        timeout: 10000,
      });
      console.log(`✅ Worker ${workerIndex}: Authenticated successfully`);
    } catch (_error) {
      console.error(
        `❌ Worker ${workerIndex}: Authentication verification failed`
      );
      throw new Error(
        `Authentication verification failed: app-logo not visible after login`
      );
    }

    await use(page);

    // Cleanup: Sign out after test
    try {
      await supaService.auth.signOut();
    } catch (_error) {
      // Ignore cleanup errors
      console.warn(`⚠️ Worker ${workerIndex}: Cleanup signout failed`, _error);
    }
  },

  authenticatedUserId: async ({ supabase }, use, testInfo) => {
    // Get user ID by signing in programmatically with the same credentials
    const workerIndex = testInfo.parallelIndex;
    const userEmail = `worker-${workerIndex}@example.com`;
    const userPassword = 'TestPassword123!';

    try {
      // Sign in to get the user session
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (error || !data.user) {
        throw new Error(
          `Failed to get user ID for ${userEmail}: ${error?.message || 'No user data'}`
        );
      }

      const userId = data.user.id;
      console.log(`✅ Worker ${workerIndex}: Found user ID ${userId}`);

      await use(userId);

      // Cleanup: Sign out after test
      await supabase.auth.signOut();
    } catch (error) {
      throw new Error(
        `Could not extract user ID from authenticated session: ${error}`
      );
    }
  },
});

export { expect } from '@playwright/test';
