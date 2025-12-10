import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * GraphQL testing fixtures for Olympus
 *
 * Provides utilities for mocking GraphQL queries and mutations with operation-based interception.
 * All GraphQL requests go to `/graphql` endpoint, so we intercept based on operationName.
 */

interface GraphQLFixtures {
  graphqlMocker: GraphQLMocker;
}

/**
 * Captured GraphQL request structure
 */
export interface CapturedGraphQLRequest {
  operationName: string;
  variables: Record<string, unknown>;
  query?: string;
  timestamp?: number;
}

/**
 * GraphQL Mocker - Intercept and mock GraphQL operations
 *
 * Features:
 * - Operation-based routing (query/mutation name)
 * - Variable validation for mutations
 * - Error response simulation
 * - Request capture for verification
 * - Network delay simulation
 */
export class GraphQLMocker {
  constructor(private page: Page) {}

  /**
   * Mock a GraphQL query response
   *
   * @param operationName - The GraphQL operation name (e.g., "GetSpaces", "GetCurrentUser")
   * @param response - The mock data to return (will be wrapped in { data: ... })
   * @param options - Additional options (delay for network simulation)
   *
   * @example
   * ```typescript
   * await graphqlMocker.interceptQuery('GetSpaces', {
   *   spaces: [
   *     { id: 'space-1', name: 'Engineering', documentCount: 42 },
   *     { id: 'space-2', name: 'Marketing', documentCount: 18 },
   *   ],
   * });
   * ```
   */
  async interceptQuery(
    operationName: string,
    response: Record<string, unknown>,
    options?: { delay?: number }
  ) {
    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        console.log(`🔍 GraphQL Query intercepted: ${operationName}`);

        // Optional delay to simulate network latency
        if (options?.delay) {
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: response }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock a GraphQL mutation with optional variable validation
   *
   * @param operationName - The GraphQL mutation name (e.g., "CreateSpace", "UpdateDocument")
   * @param response - The mock data to return (will be wrapped in { data: ... })
   * @param validator - Optional function to validate mutation variables
   *
   * @example
   * ```typescript
   * await graphqlMocker.interceptMutation(
   *   'CreateSpace',
   *   {
   *     createSpace: {
   *       id: 'new-space-123',
   *       name: 'New Engineering Space',
   *       organizationId: 'org-1',
   *     },
   *   },
   *   // Validator ensures correct variables
   *   (variables) => {
   *     return variables.name === 'New Engineering Space' && variables.organizationId === 'org-1';
   *   }
   * );
   * ```
   */
  async interceptMutation(
    operationName: string,
    response: Record<string, unknown>,
    validator?: (variables: Record<string, unknown>) => boolean
  ) {
    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        console.log(`✏️ GraphQL Mutation intercepted: ${operationName}`);

        // Validate mutation variables if validator provided
        if (validator && postData.variables) {
          const isValid = validator(postData.variables);

          if (!isValid) {
            console.log(`❌ Mutation validation failed for ${operationName}`);
            await route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({
                errors: [
                  {
                    message: 'Invalid mutation variables',
                    extensions: {
                      code: 'VALIDATION_ERROR',
                      variables: postData.variables,
                    },
                  },
                ],
              }),
            });
            return;
          }

          console.log(`✅ Mutation validation passed for ${operationName}`);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: response }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock a GraphQL error response
   *
   * @param operationName - The GraphQL operation name
   * @param errorMessage - The error message to return
   * @param errorCode - Optional error code (e.g., "UNAUTHORIZED", "NOT_FOUND")
   *
   * @example
   * ```typescript
   * await graphqlMocker.interceptError(
   *   'CreateSpace',
   *   'Space name already exists',
   *   'DUPLICATE_NAME'
   * );
   * ```
   */
  async interceptError(
    operationName: string,
    errorMessage: string,
    errorCode?: string
  ) {
    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        console.log(
          `⚠️ GraphQL Error intercepted: ${operationName} - ${errorMessage}`
        );

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: errorMessage,
                extensions: errorCode ? { code: errorCode } : undefined,
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Capture GraphQL requests for verification
   *
   * Returns an array that will be populated with captured requests.
   * Use this to verify that mutations were called with correct variables.
   *
   * @param operationName - The GraphQL operation name to capture
   * @returns Promise<Array> - Array that will contain captured requests
   *
   * @example
   * ```typescript
   * const requests = await graphqlMocker.captureRequests('UpdateSpace');
   *
   * // Trigger UI action
   * await page.fill('[name="name"]', 'Updated Name');
   * await page.click('button[type="submit"]');
   *
   * // Verify request was made
   * await page.waitForTimeout(1000);
   * expect(requests).toHaveLength(1);
   * expect(requests[0].variables).toEqual({ id: 'space-123', name: 'Updated Name' });
   * ```
   */
  async captureRequests(
    operationName: string
  ): Promise<CapturedGraphQLRequest[]> {
    const requests: CapturedGraphQLRequest[] = [];

    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        console.log(
          `📦 Captured request: ${operationName}`,
          postData.variables
        );

        requests.push({
          operationName: postData.operationName,
          variables: postData.variables,
          query: postData.query,
          timestamp: Date.now(),
        });
      }

      await route.continue();
    });

    return requests;
  }

  /**
   * Mock multiple operations at once
   *
   * Useful for setting up complex test scenarios with multiple queries/mutations.
   *
   * @param mocks - Array of mock configurations
   *
   * @example
   * ```typescript
   * await graphqlMocker.interceptMultiple([
   *   {
   *     operation: 'GetSpaces',
   *     response: { spaces: [...] },
   *   },
   *   {
   *     operation: 'GetCurrentUser',
   *     response: { me: { ... } },
   *   },
   *   {
   *     operation: 'GetDocuments',
   *     response: { documents: [...] },
   *   },
   * ]);
   * ```
   */
  async interceptMultiple(
    mocks: Array<{
      operation: string;
      response: Record<string, unknown>;
      type?: 'query' | 'mutation' | 'error';
      errorMessage?: string;
    }>
  ) {
    for (const mock of mocks) {
      if (mock.type === 'error' && mock.errorMessage) {
        await this.interceptError(mock.operation, mock.errorMessage);
      } else if (mock.type === 'mutation') {
        await this.interceptMutation(mock.operation, mock.response);
      } else {
        // Default to query
        await this.interceptQuery(mock.operation, mock.response);
      }
    }
  }

  /**
   * Mock React Query cache behavior
   *
   * Simulates deduplication and caching by tracking request counts.
   * Useful for verifying React Query optimization.
   *
   * @param operationName - The GraphQL operation name
   * @param response - The mock data to return
   * @returns Object with getRequestCount() and reset() methods
   *
   * @example
   * ```typescript
   * const cache = await graphqlMocker.mockWithCache('GetSpaces', {
   *   spaces: [...],
   * });
   *
   * // Navigate to page twice
   * await page.goto('/spaces');
   * await page.goto('/documents');
   * await page.goto('/spaces'); // Should use cache
   *
   * // Verify only one network request was made
   * expect(cache.getRequestCount()).toBe(1);
   * ```
   */
  async mockWithCache(
    operationName: string,
    response: Record<string, unknown>
  ): Promise<{ getRequestCount: () => number; reset: () => void }> {
    let requestCount = 0;

    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        requestCount++;
        console.log(`📊 Cache request #${requestCount} for ${operationName}`);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Cache-Control': 'max-age=300', // 5 minutes
          },
          body: JSON.stringify({ data: response }),
        });
      } else {
        await route.continue();
      }
    });

    return {
      getRequestCount: () => requestCount,
      reset: () => {
        requestCount = 0;
      },
    };
  }

  /**
   * Clear all route handlers
   *
   * Use this to reset mocks between tests if needed.
   */
  async clearAllMocks() {
    await this.page.unroute('**/graphql');
    console.log('🧹 Cleared all GraphQL mocks');
  }
}

/**
 * GraphQL fixture export
 *
 * Use in tests:
 * ```typescript
 * import { test, expect } from '../fixtures/graphql';
 *
 * test('my test', async ({ page, graphqlMocker }) => {
 *   await graphqlMocker.interceptQuery('GetSpaces', { spaces: [...] });
 *   // ... rest of test
 * });
 * ```
 */
export const test = base.extend<GraphQLFixtures>({
  graphqlMocker: async ({ page }, use) => {
    const mocker = new GraphQLMocker(page);
    await use(mocker);

    // Cleanup after test
    await mocker.clearAllMocks();
  },
});

export { expect };
