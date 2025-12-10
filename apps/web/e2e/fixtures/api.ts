import { test as base } from '@playwright/test';
import type { APIRequestContext, APIResponse, Page } from '@playwright/test';

/**
 * REST API testing fixtures for Olympus
 *
 * Provides authenticated API client for testing REST endpoints with Olympus JWT tokens.
 * Handles the hybrid auth flow: Supabase token → Olympus JWT exchange.
 */

interface APIFixtures {
  authenticatedAPI: AuthenticatedAPIClient;
}

/**
 * Authenticated API Client - Test REST endpoints with Olympus JWT
 *
 * Features:
 * - Token exchange (Supabase → Olympus JWT)
 * - Authenticated GET/POST/PUT/DELETE requests
 * - Request/response utilities
 * - Error handling
 */
export class AuthenticatedAPIClient {
  private apiUrl = process.env.API_URL || 'http://localhost:8000';
  private authToken: string | null = null;
  private supabaseToken: string | null = null;

  constructor(private request: APIRequestContext) {}

  /**
   * Authenticate and get Olympus JWT
   *
   * Mimics the frontend token exchange flow:
   * 1. Uses Supabase access token
   * 2. Exchanges for Olympus JWT via /auth/client-token
   * 3. Caches Olympus JWT for subsequent requests
   *
   * @param supabaseAccessToken - Access token from Supabase Auth
   * @returns The Olympus JWT token
   *
   * @example
   * ```typescript
   * const supabaseToken = await getSupabaseToken(page);
   * await authenticatedAPI.authenticate(supabaseToken);
   * ```
   */
  async authenticate(supabaseAccessToken: string): Promise<string> {
    this.supabaseToken = supabaseAccessToken;

    console.log('🔐 Exchanging Supabase token for Olympus JWT...');

    const response = await this.request.post(
      `${this.apiUrl}/auth/client-token`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      }
    );

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `Token exchange failed: ${response.status()} ${errorText}`
      );
    }

    const data = await response.json();
    this.authToken = data.client_token;

    console.log(`✅ Olympus JWT obtained (expires in ${data.expires_in}s)`);
    return this.authToken!;
  }

  /**
   * Make authenticated POST request
   *
   * @param path - API endpoint path (e.g., '/api/spaces')
   * @param payload - Request body data
   * @param headers - Additional headers (optional)
   * @returns APIResponse
   */
  async post(
    path: string,
    payload: Record<string, unknown>,
    headers?: Record<string, string>
  ) {
    this.ensureAuthenticated();

    console.log(`📤 POST ${path}`);

    return this.request.post(`${this.apiUrl}${path}`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Make authenticated GET request
   *
   * @param path - API endpoint path
   * @param headers - Additional headers (optional)
   * @returns APIResponse
   */
  async get(path: string, headers?: Record<string, string>) {
    this.ensureAuthenticated();

    console.log(`📥 GET ${path}`);

    return this.request.get(`${this.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Make authenticated PUT request
   *
   * @param path - API endpoint path
   * @param payload - Request body data
   * @param headers - Additional headers (optional)
   * @returns APIResponse
   */
  async put(
    path: string,
    payload: Record<string, unknown>,
    headers?: Record<string, string>
  ) {
    this.ensureAuthenticated();

    console.log(`🔄 PUT ${path}`);

    return this.request.put(`${this.apiUrl}${path}`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Make authenticated DELETE request
   *
   * @param path - API endpoint path
   * @param headers - Additional headers (optional)
   * @returns APIResponse
   */
  async delete(path: string, headers?: Record<string, string>) {
    this.ensureAuthenticated();

    console.log(`🗑️ DELETE ${path}`);

    return this.request.delete(`${this.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Make authenticated PATCH request
   *
   * @param path - API endpoint path
   * @param payload - Request body data
   * @param headers - Additional headers (optional)
   * @returns APIResponse
   */
  async patch(
    path: string,
    payload: Record<string, unknown>,
    headers?: Record<string, string>
  ) {
    this.ensureAuthenticated();

    console.log(`🔧 PATCH ${path}`);

    return this.request.patch(`${this.apiUrl}${path}`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Get current authentication token
   *
   * @returns The Olympus JWT token or null if not authenticated
   */
  getToken(): string | null {
    return this.authToken;
  }

  /**
   * Get Supabase token
   *
   * @returns The Supabase access token or null
   */
  getSupabaseToken(): string | null {
    return this.supabaseToken;
  }

  /**
   * Set authentication token manually
   *
   * Use this if you already have an Olympus JWT token.
   *
   * @param token - Olympus JWT token
   */
  setToken(token: string) {
    this.authToken = token;
    console.log('🔑 Olympus JWT token set manually');
  }

  /**
   * Clear authentication tokens
   */
  clearTokens() {
    this.authToken = null;
    this.supabaseToken = null;
    console.log('🧹 Authentication tokens cleared');
  }

  /**
   * Check if client is authenticated
   *
   * @returns true if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  /**
   * Refresh Olympus JWT token
   *
   * Re-exchanges the Supabase token for a fresh Olympus JWT.
   * Useful for long-running tests where the JWT might expire.
   *
   * @throws Error if no Supabase token available
   */
  async refreshToken(): Promise<string> {
    if (!this.supabaseToken) {
      throw new Error('No Supabase token available for refresh');
    }

    console.log('🔄 Refreshing Olympus JWT...');
    return this.authenticate(this.supabaseToken);
  }

  /**
   * Verify response status and throw on error
   *
   * Helper to assert successful API responses in tests.
   *
   * @param response - The API response
   * @param expectedStatus - Expected status code (default: 200)
   * @throws Error if status doesn't match
   */
  async verifyStatus(response: APIResponse, expectedStatus = 200) {
    const actualStatus = response.status();

    if (actualStatus !== expectedStatus) {
      const body = await response.text();
      throw new Error(
        `Expected status ${expectedStatus}, got ${actualStatus}. Body: ${body}`
      );
    }
  }

  /**
   * Parse JSON response with error handling
   *
   * @param response - The API response
   * @returns Parsed JSON data
   * @throws Error if parsing fails
   */
  async parseJSON<T = unknown>(response: APIResponse): Promise<T> {
    try {
      return await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('Failed to parse JSON:', error);
      throw new Error(
        `Failed to parse JSON response: ${text}. Original error: ${error}`
      );
    }
  }

  /**
   * Ensure client is authenticated
   *
   * @throws Error if not authenticated
   */
  private ensureAuthenticated() {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }
}

/**
 * API fixture export
 *
 * Use in tests:
 * ```typescript
 * import { test, expect } from '../fixtures/api';
 *
 * test('my API test', async ({ authenticatedAPI }) => {
 *   await authenticatedAPI.authenticate(supabaseToken);
 *   const response = await authenticatedAPI.get('/api/spaces');
 *   // ... assertions
 * });
 * ```
 */
export const test = base.extend<APIFixtures>({
  authenticatedAPI: async ({ request }, use) => {
    const client = new AuthenticatedAPIClient(request);
    await use(client);

    // Cleanup
    client.clearTokens();
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to get Supabase token from authenticated page
 *
 * Extracts the Supabase access token from localStorage after authentication.
 *
 * @param page - Authenticated Playwright page
 * @returns Supabase access token
 *
 * @example
 * ```typescript
 * const supabaseToken = await getSupabaseTokenFromPage(page);
 * await authenticatedAPI.authenticate(supabaseToken);
 * ```
 */
export async function getSupabaseTokenFromPage(page: Page): Promise<string> {
  const token = await page.evaluate((projectId: string) => {
    const sessionKey = `sb-${projectId}-auth-token`;
    const sessionData = localStorage.getItem(sessionKey);

    if (!sessionData) {
      throw new Error('No Supabase session found in localStorage');
    }

    const session = JSON.parse(sessionData);
    return session.access_token;
  }, process.env.SUPABASE_PROJECT_ID!);

  if (!token) {
    throw new Error('Failed to extract Supabase token from page');
  }

  return token;
}
