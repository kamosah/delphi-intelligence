import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Authentication fixtures for Olympus hybrid auth (Supabase SSR + FastAPI JWT)
 *
 * Provides multiple authentication strategies:
 * 1. setupAuthMocks() - Mock Supabase/GraphQL endpoints for isolated tests
 * 2. authenticatedPage - Per-worker auth with unique test users
 * 3. Multi-role auth - Admin, user, editor fixtures
 */

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Setup mock API route handlers for Supabase + Olympus hybrid auth
 *
 * Mocks:
 * - Supabase authentication endpoints (signInWithPassword, signUp, etc.)
 * - Olympus client token exchange endpoint
 * - GraphQL queries (me, etc.)
 *
 * Use this for tests that don't need real authentication (e.g., testing error states)
 */
export async function setupAuthMocks(page: Page) {
  // Mock Supabase login endpoint
  await page.route('**/auth/v1/token**', async (route) => {
    const request = route.request();
    const postData = request.postData();

    if (!postData) {
      await route.continue();
      return;
    }

    try {
      const data = JSON.parse(postData);

      // Simulate successful login
      if (data.email && data.password) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: 'mock-user-id',
              email: data.email,
              email_confirmed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        // Simulate invalid credentials
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid email or password',
          }),
        });
      }
    } catch (error) {
      await route.continue();
    }
  });

  // Mock Supabase signup endpoint
  await page.route('**/auth/v1/signup', async (route) => {
    const request = route.request();
    const postData = request.postData();

    if (!postData) {
      await route.continue();
      return;
    }

    try {
      const data = JSON.parse(postData);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'mock-user-id',
            email: data.email,
            email_confirmed_at: null, // Email verification pending
            created_at: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      await route.continue();
    }
  });

  // Mock Supabase user endpoint
  await page.route('**/auth/v1/user', async (route) => {
    const authHeader = route.request().headerValue('Authorization');

    if (authHeader && authHeader.includes('Bearer')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-user-id',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'unauthorized',
          error_description: 'Invalid token',
        }),
      });
    }
  });

  // Mock Olympus client token exchange endpoint
  await page.route('**/auth/client-token', async (route) => {
    const authHeader = route.request().headerValue('Authorization');

    if (authHeader && authHeader.includes('Bearer')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          client_token: 'mock-olympus-jwt',
          expires_in: 300, // 5 minutes
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'unauthorized',
          error_description: 'Missing or invalid Supabase token',
        }),
      });
    }
  });

  // Mock GraphQL me query
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (
      postData?.operationName === 'GetCurrentUser' ||
      postData?.operationName === 'Me'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            me: {
              id: 'mock-user-id',
              email: 'test@example.com',
              name: 'Test User',
              organizationId: 'mock-org-id',
              createdAt: new Date().toISOString(),
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Per-worker authentication fixture
 *
 * Creates a unique test user for each Playwright worker to enable parallel testing
 * without data conflicts.
 *
 * Use this for tests that modify data (create documents, spaces, etc.)
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, context }, use, testInfo) => {
    // Each worker gets a unique user to prevent cross-test interference
    const workerIndex = testInfo.parallelIndex;
    const userEmail = `testuser-worker-${workerIndex}@example.com`;
    const userPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

    console.log(`🔐 Worker ${workerIndex}: Authenticating as ${userEmail}`);

    // 1. Authenticate via Supabase REST API
    let authResponse;
    try {
      authResponse = await page.request.post(
        `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          data: {
            email: userEmail,
            password: userPassword,
          },
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
        }
      );

      // If user doesn't exist, create them
      if (!authResponse.ok()) {
        console.log(
          `📝 Worker ${workerIndex}: Creating new test user ${userEmail}`
        );

        const signupResponse = await page.request.post(
          `${process.env.SUPABASE_URL}/auth/v1/signup`,
          {
            data: {
              email: userEmail,
              password: userPassword,
              email_confirm: true, // Auto-confirm for testing
            },
            headers: {
              apikey: process.env.SUPABASE_ANON_KEY!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!signupResponse.ok()) {
          throw new Error(
            `Failed to create test user: ${signupResponse.status()} ${await signupResponse.text()}`
          );
        }

        authResponse = signupResponse;
      }
    } catch (error) {
      console.error(`❌ Worker ${workerIndex}: Auth failed:`, error);
      throw error;
    }

    const { access_token, refresh_token, user } = await authResponse.json();
    console.log(`✅ Worker ${workerIndex}: Authenticated as ${user.email}`);

    // 2. Inject session into browser context
    await page.goto('/');

    await page.evaluate(
      ({ accessToken, refreshToken, projectId, userId, userEmail }) => {
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: userId,
            email: userEmail,
          },
        };

        // Set in localStorage (Supabase client reads this)
        localStorage.setItem(
          `sb-${projectId}-auth-token`,
          JSON.stringify(session)
        );
      },
      {
        accessToken: access_token,
        refreshToken: refresh_token,
        projectId: process.env.SUPABASE_PROJECT_ID!,
        userId: user.id,
        userEmail: user.email,
      }
    );

    // 3. Trigger middleware token exchange by navigating to authenticated route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 4. Verify authentication succeeded
    try {
      await page
        .getByTestId('user-menu')
        .waitFor({ state: 'visible', timeout: 10000 });
      console.log(`✅ Worker ${workerIndex}: Auth verification successful`);
    } catch (error) {
      console.error(`❌ Worker ${workerIndex}: Auth verification failed`);
      throw new Error(
        'Authentication verification failed - user menu not visible'
      );
    }

    // Provide authenticated page to test
    await use(page);

    // Cleanup happens automatically when worker exits
    console.log(`🧹 Worker ${workerIndex}: Test completed`);
  },
});

export { expect } from '@playwright/test';

/**
 * Role-based authentication helper
 *
 * Use for tests that need specific user roles (admin, user, editor)
 *
 * @example
 * ```typescript
 * const adminPage = await authenticateAs(page, 'admin');
 * await adminPage.goto('/admin/settings');
 * ```
 */
export async function authenticateAs(
  page: Page,
  role: 'admin' | 'user' | 'editor' = 'user'
): Promise<Page> {
  const credentials = {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    },
    user: {
      email: process.env.TEST_USER_EMAIL || 'user@example.com',
      password: process.env.TEST_USER_PASSWORD || 'UserPassword123!',
    },
    editor: {
      email: process.env.TEST_EDITOR_EMAIL || 'editor@example.com',
      password: process.env.TEST_EDITOR_PASSWORD || 'EditorPassword123!',
    },
  }[role];

  console.log(`🔐 Authenticating as ${role}: ${credentials.email}`);

  // 1. Authenticate via Supabase REST API
  const response = await page.request.post(
    `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      data: {
        email: credentials.email,
        password: credentials.password,
      },
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Auth failed: ${response.status()} ${await response.text()}`
    );
  }

  const { access_token, refresh_token, user } = await response.json();

  // 2. Inject session
  await page.goto('/');

  await page.evaluate(
    ({ accessToken, refreshToken, projectId, userId, userEmail }) => {
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: userId,
          email: userEmail,
        },
      };

      localStorage.setItem(
        `sb-${projectId}-auth-token`,
        JSON.stringify(session)
      );
    },
    {
      accessToken: access_token,
      refreshToken: refresh_token,
      projectId: process.env.SUPABASE_PROJECT_ID!,
      userId: user.id,
      userEmail: user.email,
    }
  );

  // 3. Trigger auth flow
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // 4. Verify
  await page
    .getByTestId('user-menu')
    .waitFor({ state: 'visible', timeout: 10000 });
  console.log(`✅ Authenticated as ${role}`);

  return page;
}
