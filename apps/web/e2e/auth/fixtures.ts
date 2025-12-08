import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Mock API responses for auth testing
 */
export const mockAuthResponses = {
  /**
   * Mock successful login response
   */
  loginSuccess: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    user: {
      id: '123',
      email: 'test@example.com',
      full_name: 'Test User',
      created_at: '2024-01-01T00:00:00Z',
    },
  },

  /**
   * Mock successful signup response
   */
  signupSuccess: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    user: {
      id: '124',
      email: 'newuser@example.com',
      full_name: 'New User',
      created_at: '2024-01-01T00:00:00Z',
    },
  },

  /**
   * Mock invalid credentials error
   */
  loginInvalidCredentials: {
    detail: 'Invalid email or password',
  },

  /**
   * Mock email not verified error
   */
  loginEmailNotVerified: {
    detail: 'Email not confirmed',
  },

  /**
   * Mock email already exists error
   */
  signupEmailExists: {
    detail: 'Email already registered',
  },

  /**
   * Mock forgot password success
   */
  forgotPasswordSuccess: {
    message: 'Password reset email sent',
  },

  /**
   * Mock reset password success
   */
  resetPasswordSuccess: {
    message: 'Password successfully reset',
  },

  /**
   * Mock invalid token error
   */
  resetPasswordInvalidToken: {
    detail: 'Invalid or expired reset token',
  },
};

/**
 * Setup mock API route handlers for Supabase + Olympus hybrid auth
 */
export async function setupAuthMocks(page: Page) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for tests');
  }

  // Mock Supabase login (signInWithPassword)
  await page.route(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (
        postData.email === 'test@example.com' &&
        postData.password === 'TestPassword123!'
      ) {
        // Return Supabase session format
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-supabase-access-token',
            refresh_token: 'mock-supabase-refresh-token',
            token_type: 'bearer',
            expires_in: 3600,
            user: {
              id: '123',
              email: 'test@example.com',
              email_confirmed_at: '2024-01-01T00:00:00Z',
              user_metadata: { full_name: 'Test User' },
            },
          }),
        });
      } else if (postData.email === 'unverified@example.com') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'email_not_confirmed',
            error_description: 'Email not confirmed',
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      }
    }
  );

  // Mock Supabase session endpoint (getSession)
  await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
    const authHeader = route.request().headers()['authorization'];
    if (authHeader && authHeader.includes('mock-supabase-access-token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123',
          email: 'test@example.com',
          email_confirmed_at: '2024-01-01T00:00:00Z',
          user_metadata: { full_name: 'Test User' },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_token' }),
      });
    }
  });

  // Mock Olympus client token exchange
  await page.route(`${apiUrl}/auth/client-token`, async (route) => {
    const authHeader = route.request().headers()['authorization'];
    if (authHeader && authHeader.includes('mock-supabase-access-token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          client_token: 'mock-olympus-client-token',
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid token' }),
      });
    }
  });

  // Mock GraphQL me query
  await page.route(`${apiUrl}/graphql`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    // Check if this is a `me` query
    if (postData.query && postData.query.includes('query GetMe')) {
      const authHeader = request.headers()['authorization'];
      if (authHeader && authHeader.includes('mock-olympus-client-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              me: {
                id: '123',
                email: 'test@example.com',
                fullName: 'Test User',
                role: 'member',
                isActive: true,
                avatarUrl: null,
                emailConfirmed: true,
                bio: null,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Unauthorized' }] }),
        });
      }
    } else {
      // Let other GraphQL queries through (or mock them as needed)
      await route.continue();
    }
  });

  // Mock Supabase signup (signUp)
  await page.route(`${supabaseUrl}/auth/v1/signup`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData.email === 'existing@example.com') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'user_already_exists',
          error_description: 'User already registered',
        }),
      });
    } else {
      // Return Supabase signup response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '124',
            email: postData.email,
            email_confirmed_at: null, // Email not confirmed yet
            user_metadata: { full_name: postData.data?.full_name || '' },
          },
        }),
      });
    }
  });

  // Mock Supabase forgot password (resetPasswordForEmail)
  await page.route(`${supabaseUrl}/auth/v1/recover`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}), // Supabase returns empty object on success
    });
  });

  // Mock Supabase reset password (updateUser)
  await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
    if (route.request().method() === 'PUT') {
      const request = route.request();
      const authHeader = request.headers()['authorization'];

      if (authHeader && !authHeader.includes('invalid-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '123',
              email: 'test@example.com',
              email_confirmed_at: '2024-01-01T00:00:00Z',
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_token',
            error_description: 'Invalid or expired reset token',
          }),
        });
      }
    } else {
      // GET request for user - already handled above
      await route.continue();
    }
  });

  // Mock Supabase resend verification
  await page.route(`${supabaseUrl}/auth/v1/resend`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}), // Supabase returns empty object on success
    });
  });
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
