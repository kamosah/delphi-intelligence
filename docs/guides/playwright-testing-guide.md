# Playwright E2E Testing Guide for Olympus

> **Last Updated**: December 2025
> **Status**: Production-ready patterns for hybrid authentication testing

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication Testing](#authentication-testing)
4. [API Testing Patterns](#api-testing-patterns)
5. [Fixture Organization](#fixture-organization)
6. [Test Isolation vs Performance](#test-isolation-vs-performance)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Complete Examples](#complete-examples)
10. [Appendix](#appendix)

---

## Overview

### Tech Stack

Olympus uses a **hybrid architecture** that requires specialized E2E testing patterns:

**Authentication Layer:**

- Supabase Auth (SSR with HTTP-only cookies)
- Next.js middleware (token exchange)
- FastAPI custom JWTs (backend verification)
- Redis (JWT caching, 5-min TTL)

**State Management:**

- Zustand (client state: UI, theme, user data)
- React Query (server state: spaces, documents, queries)
- Supabase HTTP-only cookies (tokens - NOT accessible to JS)

**API Layer:**

- GraphQL (Strawberry) - Queries and mutations
- REST (FastAPI) - Auth endpoints
- SSE (Server-Sent Events) - AI streaming responses

**Rendering:**

- Next.js 14 App Router
- Hybrid SSR/CSR pages
- Server Components with Suspense

### Testing Philosophy

**When to write E2E tests:**

- ✅ Critical user flows (login, document upload, AI queries)
- ✅ Integration points (auth → middleware → backend)
- ✅ Real-time features (SSE streaming)
- ✅ Multi-step workflows (space creation → invite members)

**When NOT to write E2E tests:**

- ❌ Unit-testable logic (utils, helpers, pure functions)
- ❌ Component behavior (use Storybook interaction tests)
- ❌ API contracts (use backend integration tests)

**Key Principle:** E2E tests should verify **user-visible behavior**, not implementation details.

---

## Quick Start

### Running Tests

```bash
# Navigate to frontend
cd apps/web

# Run all tests
npm run test:e2e

# Interactive UI mode (recommended for development)
npm run test:e2e:ui

# Headed mode (visible browser)
npm run test:e2e:headed

# Debug mode (step-through)
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run single test file
npx playwright test e2e/auth/login.spec.ts

# Run tests matching pattern
npx playwright test e2e/auth/

# Run single test by name
npx playwright test -g "should login successfully"

# Run with specific browser
npx playwright test --project=chromium
```

### Environment Setup

**Required environment variables** (`.env.test`):

```bash
# Supabase (local or cloud)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_PROJECT_ID=your-project-id

# Test credentials
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=SecureTestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=SecureAdminPassword123!

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
DEBUG=false  # Set to 'pw:api' for Playwright debug logs
```

**Security:** Never commit `.env.test` to git. Add to `.gitignore`.

### Test Commands Reference

| Command                      | Description            | Use Case                 |
| ---------------------------- | ---------------------- | ------------------------ |
| `npm run test:e2e`           | Run all tests headless | CI/CD pipeline           |
| `npm run test:e2e:ui`        | Interactive UI mode    | Development, debugging   |
| `npm run test:e2e:headed`    | Visible browser        | Visual verification      |
| `npm run test:e2e:debug`     | Step-through debugger  | Complex test debugging   |
| `npx playwright codegen`     | Generate test code     | Create new tests quickly |
| `npx playwright show-report` | View HTML report       | Review test results      |

---

## Authentication Testing

### Hybrid Auth Architecture

Olympus uses a **3-layer authentication flow**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (Supabase SSR)                                      │
│    - Login via supabase.auth.signInWithPassword()               │
│    - Session stored in HTTP-only cookies (browser-managed)      │
│    - Zustand stores user data (NOT tokens)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. MIDDLEWARE (Next.js - Token Exchange)                        │
│    - Reads Supabase session from HTTP-only cookies              │
│    - Exchanges Supabase token for Olympus JWT                   │
│    - Caches in Redis (5-min TTL)                                │
│    - Forwards Olympus JWT to backend in Authorization header    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. BACKEND (FastAPI Custom JWTs)                                │
│    - Verifies Olympus JWT from Authorization header             │
│    - Extracts embedded Supabase token for RLS policies          │
│    - GraphQL context receives authenticated user                │
└─────────────────────────────────────────────────────────────────┘
```

**Testing Implications:**

- ✅ **Use API-based auth setup** (Supabase REST API) - NOT UI login
- ✅ **Storage state captures HTTP-only cookies** automatically
- ✅ **Verify auth before saving state** (check for user-specific UI element)
- ❌ **Never try to access tokens** in tests (they're HTTP-only)

### Setup Project Pattern (Recommended)

**Best for:** Read-only tests that don't modify shared server state.

**Performance:** 60-80% faster than per-test authentication.

**How it works:**

1. Global setup runs once before all tests
2. Authenticates via Supabase REST API
3. Saves storage state to `playwright/.auth/user.json`
4. All tests reuse this authenticated state

#### Implementation

**File:** `apps/web/e2e/auth.setup.ts`

```typescript
import { test as setup, expect } from '@playwright/test';

const STORAGE_STATE = 'playwright/.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  console.log('🔐 Setting up authentication...');

  // 1. Login via Supabase REST API (fast and reliable)
  const response = await request.post(
    `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      data: {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
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
  console.log(`✅ Authenticated as: ${user.email}`);

  // 2. Inject session into browser context
  await page.goto('/');

  await page.evaluate(
    ({ accessToken, refreshToken, projectId }) => {
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'test-user-id',
          email: 'testuser@example.com',
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
    }
  );

  // 3. Trigger middleware to exchange tokens
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // 4. Verify authentication succeeded
  await expect(page.getByTestId('user-menu')).toBeVisible({ timeout: 10000 });
  console.log('✅ Auth verification successful - user menu visible');

  // 5. Save authenticated state
  await page.context().storageState({ path: STORAGE_STATE });
  console.log(`✅ Storage state saved to ${STORAGE_STATE}`);
});
```

**Configuration:** `playwright.config.ts`

```typescript
export default defineConfig({
  projects: [
    // Setup project runs first
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Main tests depend on setup
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
});
```

**Usage in tests:**

```typescript
// e2e/documents/document-list.spec.ts
import { test, expect } from '@playwright/test';

// This test automatically has authenticated state!
test('should display user documents', async ({ page }) => {
  await page.goto('/documents');

  // No login needed - already authenticated via storage state
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  await expect(page.getByTestId('document-list')).toBeVisible();
});
```

### Per-Worker Fixtures (For Data-Modifying Tests)

**Best for:** Tests that create/update/delete data (CRUD operations).

**Why:** Prevents cross-test interference when running in parallel.

**How it works:**

- Each Playwright worker gets a unique test user
- Workers run in parallel without stepping on each other's data
- Slower than Setup Project, but safer for data-modifying tests

#### Implementation

**File:** `apps/web/e2e/fixtures/auth.ts`

```typescript
import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, context }, use, testInfo) => {
    // Each worker gets a unique user
    const workerIndex = testInfo.parallelIndex;
    const userEmail = `testuser-worker-${workerIndex}@example.com`;
    const userPassword = process.env.TEST_USER_PASSWORD!;

    // 1. Create or authenticate unique user
    const response = await page.request.post(
      `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        data: { email: userEmail, password: userPassword },
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
      }
    );

    // If user doesn't exist, create them
    if (!response.ok()) {
      await page.request.post(`${process.env.SUPABASE_URL}/auth/v1/signup`, {
        data: { email: userEmail, password: userPassword },
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
      });
    }

    const { access_token, refresh_token } = await response.json();

    // 2. Inject session
    await page.goto('/');
    await page.evaluate(
      ({ accessToken, refreshToken, projectId }) => {
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
          token_type: 'bearer',
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
      }
    );

    // 3. Trigger auth flow
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 4. Verify auth
    await page
      .getByTestId('user-menu')
      .waitFor({ state: 'visible', timeout: 10000 });

    // Provide authenticated page to test
    await use(page);

    // Cleanup happens automatically when worker exits
  },
});

export { expect } from '@playwright/test';
```

**Usage:**

```typescript
// e2e/spaces/space-creation.spec.ts
import { test, expect } from '../fixtures/auth';

test('should create space with unique data', async ({ authenticatedPage }) => {
  // Each worker has its own user, so no data conflicts
  const uniqueSpaceName = `Test Space ${Date.now()}`;

  await authenticatedPage.goto('/spaces/new');
  await authenticatedPage.fill('[name="name"]', uniqueSpaceName);
  await authenticatedPage.click('button[type="submit"]');

  await expect(authenticatedPage.getByText(uniqueSpaceName)).toBeVisible();
});
```

### Multi-Role Testing

**Best for:** Testing different user permissions (admin, user, editor).

**How it works:**

- Multiple storage state files (one per role)
- Separate setup scripts for each role
- Tests use role-specific storage state

#### Implementation

**Setup files:**

```typescript
// e2e/auth.setup.admin.ts
setup('authenticate admin', async ({ page, request }) => {
  const response = await request.post(/*...*/,  {
    data: {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    },
  });

  // ... auth flow ...

  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});

// e2e/auth.setup.user.ts
setup('authenticate user', async ({ page, request }) => {
  // ... similar but with TEST_USER_EMAIL ...

  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

**Configuration:**

```typescript
export default defineConfig({
  projects: [
    { name: 'setup-admin', testMatch: /auth\.setup\.admin\.ts/ },
    { name: 'setup-user', testMatch: /auth\.setup\.user\.ts/ },
    {
      name: 'admin-tests',
      dependencies: ['setup-admin'],
      use: { storageState: 'playwright/.auth/admin.json' },
      testMatch: /.*\.admin\.spec\.ts/,
    },
    {
      name: 'user-tests',
      dependencies: ['setup-user'],
      use: { storageState: 'playwright/.auth/user.json' },
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.admin\.spec\.ts/,
    },
  ],
});
```

**Usage:**

```typescript
// e2e/organizations/members.admin.spec.ts
import { test, expect } from '@playwright/test';

test('admin should manage organization members', async ({ page }) => {
  // Runs with admin storage state
  await page.goto('/organizations/settings/members');

  await expect(
    page.getByRole('button', { name: 'Invite Member' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove Member' })
  ).toBeVisible();
});

// e2e/organizations/members.spec.ts
test('user should view organization members', async ({ page }) => {
  // Runs with user storage state
  await page.goto('/organizations/settings/members');

  await expect(
    page.getByRole('button', { name: 'Invite Member' })
  ).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove Member' })
  ).not.toBeVisible();
});
```

### HTTP-Only Cookie Management

**Key Points:**

1. **Playwright automatically captures HTTP-only cookies** in `storageState()`
2. **You CANNOT access HTTP-only cookies via JavaScript** (by design for security)
3. **Storage state includes both cookies AND localStorage**

**Storage state JSON structure:**

```json
{
  "cookies": [
    {
      "name": "sb-xxxxx-auth-token",
      "value": "base64-encoded-jwt",
      "domain": "localhost",
      "path": "/",
      "httpOnly": true,
      "secure": false,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "http://localhost:3000",
      "localStorage": [
        {
          "name": "sb-xxxxx-auth-token",
          "value": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
        }
      ]
    }
  ]
}
```

**Security considerations:**

- ✅ **Never commit storage state files** - add `playwright/.auth/` to `.gitignore`
- ✅ **Storage state files contain sensitive tokens** - treat like credentials
- ✅ **Verify auth before saving state** - ensure tokens are valid
- ❌ **Never hardcode tokens** in tests
- ❌ **Never expose tokens in logs** or screenshots

---

## API Testing Patterns

### GraphQL Testing

Olympus uses Strawberry GraphQL with operation-based routing. All GraphQL requests go to `/graphql` endpoint.

#### GraphQL Mocker Fixture

**File:** `apps/web/e2e/fixtures/graphql.ts`

```typescript
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

interface GraphQLFixtures {
  graphqlMocker: GraphQLMocker;
}

export class GraphQLMocker {
  constructor(private page: Page) {}

  /**
   * Mock a GraphQL query response
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
   * Mock a GraphQL mutation with validation
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
        // Validate mutation variables if validator provided
        if (validator && !validator(postData.variables)) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              errors: [{ message: 'Invalid mutation variables' }],
            }),
          });
          return;
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
   */
  async interceptError(operationName: string, errorMessage: string) {
    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: errorMessage }],
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Capture GraphQL requests for verification
   */
  async captureRequests(operationName: string): Promise<any[]> {
    const requests: any[] = [];

    await this.page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.operationName === operationName) {
        requests.push({
          operationName: postData.operationName,
          variables: postData.variables,
          timestamp: Date.now(),
        });
      }

      await route.continue();
    });

    return requests;
  }
}

export const test = base.extend<GraphQLFixtures>({
  graphqlMocker: async ({ page }, use) => {
    const mocker = new GraphQLMocker(page);
    await use(mocker);
  },
});

export { expect };
```

#### Usage Examples

**Example 1: Mock query response**

```typescript
import { test, expect } from '../fixtures/graphql';

test('should display spaces from GraphQL', async ({ page, graphqlMocker }) => {
  // Mock the GetSpaces query
  await graphqlMocker.interceptQuery('GetSpaces', {
    spaces: [
      {
        id: 'space-1',
        name: 'Engineering',
        documentCount: 42,
      },
      {
        id: 'space-2',
        name: 'Marketing',
        documentCount: 18,
      },
    ],
  });

  await page.goto('/spaces');

  // Verify UI renders mocked data
  await expect(page.getByText('Engineering')).toBeVisible();
  await expect(page.getByText('42 documents')).toBeVisible();
  await expect(page.getByText('Marketing')).toBeVisible();
});
```

**Example 2: Mock mutation with validation**

```typescript
test('should create space via GraphQL mutation', async ({
  page,
  graphqlMocker,
}) => {
  // Mock CreateSpace mutation with variable validation
  await graphqlMocker.interceptMutation(
    'CreateSpace',
    {
      createSpace: {
        id: 'new-space-123',
        name: 'New Engineering Space',
        organizationId: 'org-1',
      },
    },
    // Validator ensures correct variables
    (variables) => {
      return (
        variables.name === 'New Engineering Space' &&
        variables.organizationId === 'org-1'
      );
    }
  );

  await page.goto('/spaces/new');
  await page.fill('[name="name"]', 'New Engineering Space');
  await page.selectOption('[name="organizationId"]', 'org-1');
  await page.click('button[type="submit"]');

  // Verify success message
  await expect(page.getByText('Space created successfully')).toBeVisible();
});
```

**Example 3: Mock error response**

```typescript
test('should handle GraphQL errors gracefully', async ({
  page,
  graphqlMocker,
}) => {
  await graphqlMocker.interceptError(
    'CreateSpace',
    'Space name already exists'
  );

  await page.goto('/spaces/new');
  await page.fill('[name="name"]', 'Duplicate Space');
  await page.click('button[type="submit"]');

  // Verify error message displayed
  await expect(page.getByText('Space name already exists')).toBeVisible();
});
```

**Example 4: Verify request was made**

```typescript
test('should send correct variables to GraphQL', async ({
  page,
  graphqlMocker,
}) => {
  const requests = await graphqlMocker.captureRequests('UpdateSpace');

  await page.goto('/spaces/space-123/settings');
  await page.fill('[name="name"]', 'Updated Name');
  await page.click('button[type="submit"]');

  // Wait for the UpdateSpace GraphQL request to be sent
  await page.waitForResponse(
    (response) =>
      response.url().includes('/graphql') &&
      response.request().postDataJSON()?.operationName === 'UpdateSpace'
  );

  // Verify variables
  expect(requests).toHaveLength(1);
  expect(requests[0].variables).toEqual({
    id: 'space-123',
    name: 'Updated Name',
  });
});
```

### REST API Testing

Olympus has REST endpoints for auth (`/auth/register`, `/auth/me`, `/auth/client-token`) and SSE streaming.

#### Authenticated API Client Fixture

**File:** `apps/web/e2e/fixtures/api.ts`

```typescript
import { test as base } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

interface APIFixtures {
  authenticatedAPI: AuthenticatedAPIClient;
}

export class AuthenticatedAPIClient {
  private apiUrl = process.env.API_URL || 'http://localhost:8000';
  private authToken: string | null = null;

  constructor(private request: APIRequestContext) {}

  /**
   * Authenticate and get Olympus JWT
   * (Mimics frontend token exchange flow)
   */
  async authenticate(supabaseAccessToken: string) {
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
      throw new Error(`Token exchange failed: ${response.status()}`);
    }

    const data = await response.json();
    this.authToken = data.client_token;
    return this.authToken;
  }

  /**
   * Make authenticated POST request
   */
  async post(path: string, payload: Record<string, unknown>) {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    return this.request.post(`${this.apiUrl}${path}`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }

  /**
   * Make authenticated GET request
   */
  async get(path: string) {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    return this.request.get(`${this.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(path: string) {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    return this.request.delete(`${this.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }
}

export const test = base.extend<APIFixtures>({
  authenticatedAPI: async ({ request }, use) => {
    const client = new AuthenticatedAPIClient(request);
    await use(client);
  },
});

export { expect } from '@playwright/test';
```

#### Usage Examples

**Example 1: Test REST endpoint**

```typescript
import { test, expect } from '../fixtures/api';

test('should get user profile via REST API', async ({ authenticatedAPI }) => {
  // Authenticate first
  await authenticatedAPI.authenticate(process.env.TEST_SUPABASE_TOKEN!);

  // Call REST endpoint
  const response = await authenticatedAPI.get('/auth/me');

  expect(response.ok()).toBeTruthy();

  const user = await response.json();
  expect(user.email).toBe(process.env.TEST_USER_EMAIL);
});
```

**Example 2: Hybrid API + UI test**

```typescript
test('should create document via API and verify in UI', async ({
  page,
  authenticatedAPI,
}) => {
  // 1. Create document via API (fast)
  await authenticatedAPI.authenticate(process.env.TEST_SUPABASE_TOKEN!);

  const createResponse = await authenticatedAPI.post('/api/documents', {
    name: 'Test Document',
    spaceId: 'space-123',
    content: 'This is a test document',
  });

  const document = await createResponse.json();

  // 2. Verify it appears in UI
  await page.goto('/documents');
  await expect(page.getByText('Test Document')).toBeVisible();
});
```

### SSE (Server-Sent Events) Testing

Olympus uses SSE for AI response streaming (`/api/thread/stream`).

#### SSE Test Client Fixture

**File:** `apps/web/e2e/fixtures/sse.ts`

```typescript
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

interface SSEFixtures {
  sseClient: SSETestClient;
}

export class SSETestClient {
  constructor(private page: Page) {}

  /**
   * Connect to SSE stream and collect events
   */
  async connectAndCollectEvents(url: string, timeout = 30000): Promise<any[]> {
    return await this.page.evaluate(
      async ({ url, timeout }) => {
        return new Promise<any[]>((resolve, reject) => {
          const events: any[] = [];
          let timeoutId: NodeJS.Timeout;

          const eventSource = new EventSource(url);

          const messageHandler = (event: Event) => {
            const messageEvent = event as MessageEvent;
            try {
              const data = JSON.parse(messageEvent.data);
              events.push({
                type: data.type,
                data,
                timestamp: Date.now(),
              });

              // Stop on done event
              if (data.type === 'done') {
                eventSource.close();
                clearTimeout(timeoutId);
                resolve(events);
              }
            } catch (error) {
              console.error('SSE parse error:', error);
            }
          };

          const errorHandler = () => {
            eventSource.close();
            clearTimeout(timeoutId);
            resolve(events); // Return events collected before error
          };

          eventSource.onmessage = messageHandler;
          eventSource.onerror = errorHandler;

          // Timeout protection
          timeoutId = setTimeout(() => {
            eventSource.close();
            reject(new Error(`SSE stream timeout after ${timeout}ms`));
          }, timeout);
        });
      },
      { url, timeout }
    );
  }

  /**
   * Extract text tokens from streaming response
   */
  extractTokens(events: any[]): string {
    return events
      .filter((e) => e.type === 'token')
      .map((e) => e.data.content || '')
      .join('');
  }

  /**
   * Find citations in stream
   */
  findCitations(events: any[]): any[] {
    const citationEvents = events.filter((e) => e.type === 'citations');
    return citationEvents.flatMap((e) => e.data.sources || []);
  }

  /**
   * Verify event sequence matches expected types
   */
  verifyEventSequence(events: any[], expectedTypes: string[]) {
    const actualTypes = events.map((e) => e.type);
    expect(actualTypes).toEqual(expectedTypes);
  }
}

export const test = base.extend<SSEFixtures>({
  sseClient: async ({ page }, use) => {
    const client = new SSETestClient(page);
    await use(client);
  },
});

export { expect };
```

#### Usage Examples

**Example 1: Test AI streaming response**

```typescript
import { test, expect } from '../fixtures/sse';

test('should stream AI response with citations', async ({
  page,
  sseClient,
}) => {
  await page.goto('/threads/thread-123');

  // Start SSE stream
  const streamUrl = `http://localhost:8000/api/thread/stream?query=What%20is%20risk?&space_id=space-123`;

  const events = await sseClient.connectAndCollectEvents(streamUrl, 30000);

  // Verify event types
  expect(events.length).toBeGreaterThan(0);

  const tokens = events.filter((e) => e.type === 'token');
  expect(tokens.length).toBeGreaterThan(0);

  const citations = sseClient.findCitations(events);
  expect(citations.length).toBeGreaterThan(0);

  const doneEvent = events.find((e) => e.type === 'done');
  expect(doneEvent).toBeDefined();
  expect(doneEvent.data.confidence_score).toBeDefined();

  // Verify full response
  const fullResponse = sseClient.extractTokens(events);
  expect(fullResponse.length).toBeGreaterThan(0);
  console.log('AI Response:', fullResponse);
});
```

**Example 2: Test streaming in UI**

```typescript
test('should display streaming tokens in UI', async ({ page, sseClient }) => {
  await page.goto('/threads/new');

  await page.fill('[name="query"]', 'What is technical debt?');
  await page.click('button[type="submit"]');

  // Wait for first token to appear
  await expect(page.locator('[data-testid="streaming-response"]')).toBeVisible({
    timeout: 10000,
  });

  // Wait for streaming to complete (look for "done" indicator)
  await expect(page.locator('[data-testid="response-complete"]')).toBeVisible({
    timeout: 30000,
  });

  // Verify citations rendered
  await expect(page.locator('[data-testid="citation-badge"]')).toBeVisible();
});
```

**Example 3: Test error handling**

```typescript
test('should handle SSE errors gracefully', async ({ page, sseClient }) => {
  const streamUrl = `http://localhost:8000/api/thread/stream?query=invalid&space_id=invalid-uuid`;

  const events = await sseClient.connectAndCollectEvents(streamUrl, 10000);

  // Should receive error event
  const errorEvent = events.find((e) => e.type === 'error');
  expect(errorEvent).toBeDefined();
  expect(errorEvent.data.error_code).toMatch(/VALIDATION_ERROR|NOT_FOUND/);
});
```

### Hybrid Testing (UI + API)

**When to use:**

- ✅ **API for setup, UI for verification** - Fastest approach
- ✅ **UI for action, API for verification** - Validates backend state
- ❌ **Full UI flow when API would suffice** - Unnecessarily slow

**Example: Create space via API, verify in UI**

```typescript
import { test, expect } from '../fixtures/api';

test('should sync space from API to UI', async ({ page, authenticatedAPI }) => {
  // 1. Create space via API (fast)
  await authenticatedAPI.authenticate(process.env.TEST_SUPABASE_TOKEN!);

  const response = await authenticatedAPI.post('/api/spaces', {
    name: 'API-Created Space',
    organizationId: 'org-123',
  });

  const space = await response.json();
  expect(space.id).toBeDefined();

  // 2. Navigate to spaces list
  await page.goto('/spaces');

  // 3. Verify React Query fetched the new space
  await expect(page.getByText('API-Created Space')).toBeVisible();
});
```

---

## Fixture Organization

### Fixture Architecture

**Key Principle:** Compose fixtures as needed, avoid creating mega-fixtures.

**Base fixtures:**

- `auth.ts` - Authentication helpers
- `graphql.ts` - GraphQL mocking
- `api.ts` - REST API client
- `sse.ts` - SSE streaming client

**Composition pattern:**

```typescript
// e2e/fixtures/index.ts - Central export
import { test as authTest } from './auth';
import { test as graphqlTest } from './graphql';
import { test as apiTest } from './api';
import { test as sseTest } from './sse';

// Compose all fixtures
export const test = authTest
  .extend(graphqlTest)
  .extend(apiTest)
  .extend(sseTest);

export { expect } from '@playwright/test';
```

**Usage:**

```typescript
// Import composed fixture with ALL utilities
import { test, expect } from '@/e2e/fixtures';

test('complex test with all fixtures', async ({
  authenticatedPage,
  graphqlMocker,
  authenticatedAPI,
  sseClient,
}) => {
  // Use any combination of fixtures as needed
});
```

### File Structure

```
apps/web/e2e/
├── fixtures/
│   ├── index.ts                    # Composed fixture export
│   ├── auth.ts                     # Auth helpers
│   ├── graphql.ts                  # GraphQL mocker
│   ├── api.ts                      # REST API client
│   └── sse.ts                      # SSE streaming client
├── utils/
│   ├── test-data.ts                # Mock data builders
│   └── selectors.ts                # Common selectors
├── auth/
│   ├── login.spec.ts
│   ├── signup.spec.ts
│   └── password-reset.spec.ts
├── documents/
│   ├── document-upload.spec.ts
│   ├── document-search.spec.ts
│   └── document-delete.spec.ts
├── spaces/
│   ├── space-creation.spec.ts
│   ├── space-members.spec.ts
│   └── space-permissions.spec.ts
├── threads/
│   └── thread-streaming.spec.ts
└── auth.setup.ts                   # Global auth setup
```

### Utility Helpers

**Test data builders** (`e2e/utils/test-data.ts`):

```typescript
export function createMockUser(overrides?: Partial<User>) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'org-1',
    ...overrides,
  };
}

export function createMockSpace(overrides?: Partial<Space>) {
  return {
    id: `space-${Date.now()}`,
    name: 'Test Space',
    organizationId: 'org-1',
    documentCount: 0,
    ...overrides,
  };
}

export function createMockDocument(overrides?: Partial<Document>) {
  return {
    id: `doc-${Date.now()}`,
    name: 'Test Document.pdf',
    spaceId: 'space-123',
    status: 'processed',
    uploadedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

**Common selectors** (`e2e/utils/selectors.ts`):

```typescript
export const selectors = {
  // Auth
  userMenu: '[data-testid="user-menu"]',
  loginEmail: '[name="email"]',
  loginPassword: '[name="password"]',

  // Spaces
  spaceList: '[data-testid="space-list"]',
  spaceCard: '[data-testid="space-card"]',
  createSpaceButton: '[data-testid="create-space-button"]',

  // Documents
  documentList: '[data-testid="document-list"]',
  uploadButton: '[data-testid="upload-button"]',

  // Threads
  threadInput: '[data-testid="thread-input"]',
  streamingResponse: '[data-testid="streaming-response"]',
  citationBadge: '[data-testid="citation-badge"]',
};
```

---

## Test Isolation vs Performance

### Decision Framework

```
┌─────────────────────────────────────────────────────────────┐
│ Test Isolation Decision Tree                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Do tests modify shared server state?                        │
│  ├─ NO (read-only tests)                                   │
│  │   → Use Setup Project + shared storageState              │
│  │   → Best: 60-80% faster, simple, parallel-safe          │
│  │                                                           │
│  └─ YES (create/update/delete documents/spaces)           │
│      → Use Per-Worker Fixture                               │
│      → Each worker gets unique user/data                    │
│      → Slower but prevents cross-test conflicts             │
│                                                              │
│ Do you need to test multiple user roles?                   │
│  ├─ YES → Use multiple storageState files                  │
│  │   └─ playwright/.auth/admin.json                        │
│  │   └─ playwright/.auth/user.json                          │
│  │                                                           │
│  └─ NO → Single shared storageState                         │
│                                                              │
│ Are tests fast enough?                                      │
│  ├─ NO → Enable full parallelism (Setup Project)           │
│  │   → Default Playwright parallel = 4 workers             │
│  │   → Can increase in CI: workers: N                       │
│  │                                                           │
│  └─ YES → Keep current strategy                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Strategy for Olympus

| Test Category                  | Strategy      | Why                             |
| ------------------------------ | ------------- | ------------------------------- |
| **Auth flows** (login, signup) | Setup Project | Read-only, fast, parallel-safe  |
| **Document viewing**           | Setup Project | Read-only, no data modification |
| **Space viewing**              | Setup Project | Read-only, no data modification |
| **Document upload**            | Per-Worker    | Creates new documents           |
| **Space creation**             | Per-Worker    | Creates new spaces              |
| **Member invites**             | Per-Worker    | Modifies organization state     |
| **Thread queries**             | Setup Project | Read-only (if using mock AI)    |

### Parallelization

**Local development:**

```typescript
// playwright.config.ts
workers: process.env.CI ? 1 : undefined, // Default: CPU cores / 2
```

**CI/CD:**

```typescript
workers: 1, // Sequential to avoid auth race conditions
```

**Why sequential in CI?**

- Storage state setup can race if multiple workers start simultaneously
- Redis token cache may conflict
- Supabase rate limits on auth endpoints

### Test Data Management

**Use `testInfo.parallelIndex` for unique data:**

```typescript
test('create space with unique name', async ({ page }, testInfo) => {
  const workerIndex = testInfo.parallelIndex;
  const uniqueName = `Test Space Worker ${workerIndex} - ${Date.now()}`;

  await page.goto('/spaces/new');
  await page.fill('[name="name"]', uniqueName);
  await page.click('button[type="submit"]');

  await expect(page.getByText(uniqueName)).toBeVisible();
});
```

**Cleanup strategies:**

```typescript
// Option 1: Cleanup after each test
test.afterEach(async ({ request }) => {
  await request.delete('/api/test-data/cleanup');
});

// Option 2: Use unique test data per worker (no cleanup needed)
const testSpaceId = `test-space-worker-${testInfo.parallelIndex}`;
```

---

## Best Practices

### Security

**Critical rules:**

1. **Never commit auth files:**

   ```bash
   # .gitignore
   playwright/.auth/
   .env.test
   .env.local
   ```

2. **Use environment variables for credentials:**

   ```typescript
   // Good
   email: process.env.TEST_USER_EMAIL;

   // Bad
   email: 'test@example.com';
   ```

3. **Verify auth before saving state:**

   ```typescript
   // Always check that auth succeeded
   await expect(page.getByTestId('user-menu')).toBeVisible();

   // THEN save state
   await context.storageState({ path: STORAGE_STATE });
   ```

4. **Storage state files contain sensitive tokens:**
   - Treat like credentials
   - Never share or commit
   - Rotate regularly in CI

### Selectors

**Preference order:**

1. **Semantic selectors** (best):

   ```typescript
   page.getByRole('button', { name: 'Submit' });
   page.getByLabel('Email');
   page.getByText('Welcome');
   ```

2. **`data-testid` attributes** (good for complex components):

   ```typescript
   page.getByTestId('user-menu');
   page.getByTestId('document-list');
   ```

3. **CSS selectors** (last resort):
   ```typescript
   page.locator('[name="email"]');
   page.locator('.btn-primary');
   ```

**Why avoid CSS classes?**

- Tailwind classes change frequently
- Breaks tests when refactoring styles
- Harder to understand intent

### Assertions

**Wait patterns:**

```typescript
// Good: Wait for visibility
await expect(page.getByText('Success')).toBeVisible();

// Bad: Check immediately (may fail if element not loaded)
expect(await page.getByText('Success').isVisible()).toBe(true);
```

**Navigation waits:**

```typescript
// After form submission
await page.click('button[type="submit"]');
await page.waitForURL('/dashboard'); // Wait for redirect

// After data fetch
await page.goto('/documents');
await page.waitForLoadState('networkidle'); // Wait for GraphQL requests
```

**Timeout configuration:**

```typescript
// Per-assertion timeout
await expect(page.getByText('Slow element')).toBeVisible({ timeout: 10000 });

// Per-test timeout
test.setTimeout(60000); // 60 seconds

// Global timeout
// playwright.config.ts
timeout: 30000, // 30 seconds default
```

### Test Organization

**Feature-based structure:**

```
e2e/
├── auth/              # Login, signup, password reset
├── documents/         # Document CRUD
├── spaces/            # Space management
├── threads/           # AI interactions
└── organizations/     # Org settings, members
```

**Clear test naming:**

```typescript
// Good
test('should display error when email is invalid', ...)
test('should create space with valid name', ...)

// Bad
test('test 1', ...)
test('it works', ...)
```

**Group related tests:**

```typescript
test.describe('Login Flow', () => {
  test('should login with valid credentials', ...)
  test('should show error with invalid credentials', ...)
  test('should redirect to forgot password', ...)
});
```

### Debugging

**UI mode (interactive):**

```bash
npm run test:e2e:ui
```

- Step through tests
- Inspect DOM
- Time travel debugging
- View network requests

**Headed mode (visible browser):**

```bash
npm run test:e2e:headed
```

**Debug mode (VS Code integration):**

```bash
npm run test:e2e:debug
```

**Screenshot/video artifacts:**

```typescript
// playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}
```

**View trace:**

```bash
npx playwright show-trace trace.zip
```

---

## Troubleshooting

### Common Issues

#### Auth Failures

**Symptom:** Tests fail with "not authenticated" errors

**Solutions:**

1. **Verify storage state exists:**

   ```bash
   ls playwright/.auth/user.json
   ```

2. **Check token expiration:**

   ```typescript
   // Add to auth.setup.ts
   const tokenExpiry = JSON.parse(atob(access_token.split('.')[1])).exp;
   console.log('Token expires:', new Date(tokenExpiry * 1000));
   ```

3. **Force re-authentication:**
   ```bash
   rm playwright/.auth/user.json
   npm run test:e2e
   ```

#### Flaky Tests

**Symptom:** Tests pass sometimes, fail other times

**Solutions:**

1. **Use proper wait patterns:**

   ```typescript
   // Instead of waiting for a fixed timeout...
   // await page.waitForTimeout(1000); // ❌ Anti-pattern: leads to flaky tests

   // ...wait for a real condition, such as a UI element or network response:
   await expect(page.getByText('Loaded')).toBeVisible(); // ✅ Good: waits for UI
   await page.waitForResponse(
     (response) =>
       response.url().includes('/graphql') && response.status() === 200
   ); // ✅ Good: waits for GraphQL network response
   ```

2. **Wait for network idle:**

   ```typescript
   await page.goto('/documents');
   await page.waitForLoadState('networkidle');
   ```

3. **Increase timeout for slow operations:**
   ```typescript
   await expect(page.getByText('Uploaded')).toBeVisible({ timeout: 30000 });
   ```

#### Timeout Errors

**Symptom:** Tests fail with "Timeout 30000ms exceeded"

**Solutions:**

1. **Increase timeout for specific assertion:**

   ```typescript
   await expect(element).toBeVisible({ timeout: 60000 });
   ```

2. **Increase test timeout:**

   ```typescript
   test.setTimeout(120000); // 2 minutes
   ```

3. **Check for network issues:**
   ```typescript
   // Log network requests
   page.on('request', (req) => console.log(req.url()));
   page.on('response', (res) => console.log(res.status(), res.url()));
   ```

#### Race Conditions

**Symptom:** Tests fail inconsistently, especially in parallel

**Solutions:**

1. **Use unique data per worker:**

   ```typescript
   const uniqueId = `test-${testInfo.parallelIndex}-${Date.now()}`;
   ```

2. **Switch to Per-Worker fixtures:**

   ```typescript
   // Instead of Setup Project
   import { test } from '../fixtures/auth';
   ```

3. **Disable parallelization temporarily:**
   ```bash
   PLAYWRIGHT_WORKERS=1 npm run test:e2e
   ```

#### HTTP-Only Cookie Issues

**Symptom:** Storage state doesn't persist authentication

**Solutions:**

1. **Verify cookies in storage state:**

   ```bash
   cat playwright/.auth/user.json | grep "httpOnly"
   ```

2. **Check localStorage AND cookies:**

   ```typescript
   // Both are needed for Supabase SSR
   await page.evaluate(() => {
     console.log('LocalStorage:', localStorage.getItem('sb-xxx-auth-token'));
   });
   ```

3. **Ensure middleware runs:**
   ```typescript
   // Navigate to trigger middleware
   await page.goto('/dashboard');
   await page.waitForLoadState('networkidle');
   ```

---

## Complete Examples

### Example 1: Login Flow

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '../fixtures/graphql';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({
    page,
    graphqlMocker,
  }) => {
    // Mock GraphQL me query
    await graphqlMocker.interceptQuery('GetCurrentUser', {
      me: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-1',
      },
    });

    await page.goto('/login');

    // Fill form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify redirect
    await expect(page).toHaveURL('/dashboard');

    // Verify UI state
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({
    page,
    graphqlMocker,
  }) => {
    // Mock auth error
    await graphqlMocker.interceptError('Login', 'Invalid email or password');

    await page.goto('/login');
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.getByText('Invalid email or password')).toBeVisible();

    // Verify still on login page
    await expect(page).toHaveURL('/login');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify validation error
    await expect(page.getByText('Invalid email format')).toBeVisible();
  });
});
```

### Example 2: Document Upload

```typescript
// e2e/documents/document-upload.spec.ts
import { test, expect } from '../fixtures';

test.describe('Document Upload', () => {
  test('should upload document and show in list', async ({
    authenticatedPage,
    graphqlMocker,
  }) => {
    // Mock CreateDocument mutation
    await graphqlMocker.interceptMutation('CreateDocument', {
      createDocument: {
        id: 'doc-123',
        name: 'test-document.pdf',
        status: 'processing',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Mock GetDocuments query
    await graphqlMocker.interceptQuery('GetDocuments', {
      documents: [
        {
          id: 'doc-123',
          name: 'test-document.pdf',
          status: 'processed',
          uploadedAt: new Date().toISOString(),
        },
      ],
    });

    await authenticatedPage.goto('/documents/upload');

    // Upload file
    const fileInput = authenticatedPage.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample.pdf');

    await authenticatedPage.click('button[type="submit"]');

    // Verify success message
    await expect(
      authenticatedPage.getByText('Document uploaded successfully')
    ).toBeVisible();

    // Navigate to documents list
    await authenticatedPage.goto('/documents');

    // Verify document appears
    await expect(
      authenticatedPage.getByText('test-document.pdf')
    ).toBeVisible();
    await expect(authenticatedPage.getByText('Processed')).toBeVisible();
  });

  test('should show error for invalid file type', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/documents/upload');

    const fileInput = authenticatedPage.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/invalid.exe');

    await expect(
      authenticatedPage.getByText(
        'Invalid file type. Only PDF, DOCX, TXT allowed.'
      )
    ).toBeVisible();
  });
});
```

### Example 3: Space Creation

```typescript
// e2e/spaces/space-creation.spec.ts
import { test, expect } from '../fixtures/auth'; // Per-worker fixture

test.describe('Space Creation', () => {
  test('should create space with unique name', async ({
    authenticatedPage,
  }, testInfo) => {
    // Use worker index for unique data
    const uniqueName = `Test Space Worker ${testInfo.parallelIndex} - ${Date.now()}`;

    await authenticatedPage.goto('/spaces/new');

    await authenticatedPage.fill('[name="name"]', uniqueName);
    await authenticatedPage.fill(
      '[name="description"]',
      'Test space description'
    );
    await authenticatedPage.click('button[type="submit"]');

    // Verify redirect to space page
    await expect(authenticatedPage).toHaveURL(/\/spaces\/space-\w+/);

    // Verify space details
    await expect(
      authenticatedPage.getByRole('heading', { name: uniqueName })
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText('Test space description')
    ).toBeVisible();
  });

  test('should validate required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/spaces/new');

    // Try to submit without filling fields
    await authenticatedPage.click('button[type="submit"]');

    // Verify validation errors
    await expect(
      authenticatedPage.getByText('Space name is required')
    ).toBeVisible();
  });
});
```

### Example 4: Thread Streaming

```typescript
// e2e/threads/thread-streaming.spec.ts
import { test, expect } from '../fixtures/sse';

test.describe('Thread Streaming', () => {
  test('should stream AI response with citations', async ({
    page,
    sseClient,
  }) => {
    await page.goto('/threads/new');

    // Send query
    await page.fill('[data-testid="thread-input"]', 'What is technical debt?');
    await page.click('button[type="submit"]');

    // Wait for streaming to start
    await expect(
      page.locator('[data-testid="streaming-response"]')
    ).toBeVisible({
      timeout: 10000,
    });

    // Collect SSE events (in browser context)
    const streamUrl = await page.evaluate(() => {
      // Get the actual SSE URL from the EventSource connection
      return (window as any).currentStreamUrl;
    });

    // Verify streaming completes
    await expect(page.locator('[data-testid="response-complete"]')).toBeVisible(
      {
        timeout: 30000,
      }
    );

    // Verify citations rendered
    const citationBadges = page.locator('[data-testid="citation-badge"]');
    await expect(citationBadges).toHaveCount(await citationBadges.count());
    expect(await citationBadges.count()).toBeGreaterThan(0);

    // Verify response text
    const responseText = await page
      .locator('[data-testid="streaming-response"]')
      .textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(50); // Reasonable response length
  });

  test('should handle streaming errors', async ({ page }) => {
    await page.goto('/threads/new');

    // Send query that will cause error
    await page.fill('[data-testid="thread-input"]', ''); // Empty query
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.getByText('Query cannot be empty')).toBeVisible();
  });
});
```

---

## Appendix

### A. Playwright Configuration Reference

**Current config:** `apps/web/playwright.config.ts`

Key settings:

- Base URL: `http://localhost:3000`
- Test directory: `./e2e`
- Parallel workers: `process.env.CI ? 1 : undefined`
- Retries: `process.env.CI ? 2 : 0`
- Timeout: 30 seconds default
- Web server: Auto-starts Next.js dev server

### B. Environment Variables

**Required variables (`.env.test`):**

```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_PROJECT_ID=your-project-id

# Test users
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=SecurePassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=SecureAdminPassword123!

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
DEBUG=false
```

### C. Test Commands

**Full command reference:**

```bash
# Run tests
npm run test:e2e                        # All tests headless
npm run test:e2e:ui                     # Interactive UI mode
npm run test:e2e:headed                 # Visible browser
npm run test:e2e:debug                  # Debug mode

# Run specific tests
npx playwright test e2e/auth/           # Specific directory
npx playwright test login.spec.ts       # Specific file
npx playwright test -g "should login"   # By test name

# Debugging
npx playwright codegen http://localhost:3000  # Generate tests
npx playwright show-report                    # View results
npx playwright show-trace trace.zip           # View trace

# Utility
npx playwright install                  # Install browsers
npx playwright install-deps             # Install dependencies
```

### D. CI/CD Integration

**GitHub Actions example:**

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

---

## Summary

This guide covers comprehensive Playwright E2E testing patterns for Olympus's hybrid architecture:

✅ **Authentication:** API-based setup, storage state, HTTP-only cookies
✅ **API Testing:** GraphQL mocking, REST clients, SSE streaming
✅ **Fixtures:** Composable, reusable test utilities
✅ **Performance:** Setup Project (60-80% faster) vs Per-Worker isolation
✅ **Best Practices:** Security, selectors, assertions, debugging

**Key takeaway:** Use Setup Project for read-only tests, Per-Worker for data-modifying tests, and always verify auth before saving storage state.

For questions or improvements, see:

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Olympus E2E README](../apps/web/e2e/README.md)
- [CLAUDE.md Testing Section](../CLAUDE.md#e2e-testing-with-playwright)
