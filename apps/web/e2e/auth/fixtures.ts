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
 * Setup mock API route handlers
 */
export async function setupAuthMocks(page: Page) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Mock successful login
  await page.route(`${apiUrl}/auth/login`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (
      postData.email === 'test@example.com' &&
      postData.password === 'TestPassword123!'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.loginSuccess),
      });
    } else if (postData.email === 'unverified@example.com') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.loginEmailNotVerified),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.loginInvalidCredentials),
      });
    }
  });

  // Mock signup
  await page.route(`${apiUrl}/auth/register`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData.email === 'existing@example.com') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.signupEmailExists),
      });
    } else {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.signupSuccess),
      });
    }
  });

  // Mock forgot password
  await page.route(`${apiUrl}/auth/forgot-password`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthResponses.forgotPasswordSuccess),
    });
  });

  // Mock reset password
  await page.route(`${apiUrl}/auth/reset-password`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData.token === 'invalid-token') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.resetPasswordInvalidToken),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAuthResponses.resetPasswordSuccess),
      });
    }
  });

  // Mock resend verification
  await page.route(`${apiUrl}/auth/resend-verification`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Verification email sent' }),
    });
  });

  // Mock /auth/me (get current user profile)
  await page.route(`${apiUrl}/auth/me`, async (route) => {
    const request = route.request();
    const authHeader = request.headers()['authorization'];

    // Check if valid Bearer token is present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'user',
          is_active: true,
          email_confirmed: true,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Unauthorized' }),
      });
    }
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
