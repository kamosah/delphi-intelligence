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

    // 1. Authenticate via Supabase REST API
    const authResponse = await page.request.post(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        data: {
          email: userEmail,
          password: userPassword,
        },
        headers: {
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!authResponse.ok()) {
      const errorText = await authResponse.text();
      throw new Error(
        `Authentication failed for ${userEmail}: ${authResponse.status()} ${errorText}`
      );
    }

    const authData = await authResponse.json();
    const { access_token, refresh_token, user } = authData;

    if (!access_token || !user) {
      throw new Error(
        `Invalid auth response for ${userEmail}: missing access_token or user`
      );
    }

    // 2. Set Supabase session cookie (HTTP-only)
    // This simulates how Supabase SSR sets the auth cookie
    await page.context().addCookies([
      {
        name: `sb-${supabaseProjectId}-auth-token`,
        value: JSON.stringify({
          access_token,
          refresh_token,
          expires_in: 3600,
          token_type: 'bearer',
          user,
        }),
        domain: 'localhost',
        path: '/',
        httpOnly: true, // HTTP-only cookie (matches Supabase SSR)
        secure: false, // false for localhost
        sameSite: 'Lax',
      },
    ]);

    // 3. Navigate to trigger Next.js middleware token exchange
    // Middleware reads Supabase cookie → exchanges for Olympus JWT
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 4. Verify authentication succeeded (check for user menu)
    try {
      await page.getByTestId('user-menu').waitFor({
        state: 'visible',
        timeout: 10000,
      });
      console.log(`✅ Worker ${workerIndex}: Authenticated successfully`);
    } catch (_error) {
      console.error(
        `❌ Worker ${workerIndex}: Authentication verification failed`
      );
      throw new Error(
        `Authentication verification failed: user-menu not visible after login`
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

  authenticatedUserId: async ({ page }, use) => {
    // Extract user ID from page storage
    const userId = await page.evaluate(() => {
      // Try to get user ID from localStorage (Supabase session)
      const storageKeys = Object.keys(localStorage);
      const authKey = storageKeys.find((key) => key.includes('auth-token'));

      if (authKey) {
        try {
          const session = JSON.parse(localStorage.getItem(authKey) || '{}');
          return session?.user?.id || null;
        } catch {
          return null;
        }
      }

      return null;
    });

    if (!userId) {
      throw new Error('Could not extract user ID from authenticated session');
    }

    await use(userId);
  },
});

export { expect } from '@playwright/test';
