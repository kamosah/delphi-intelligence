# E2E Testing with Playwright

This directory contains end-to-end tests for the Olympus MVP web application using Playwright.

## Setup

Playwright is already installed. To install the browsers:

```bash
npx playwright install
```

## Running Tests

```bash
# Run all tests in headless mode
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Run Tests by Feature

```bash
# Run all auth tests
npm run test:e2e e2e/auth

# Run specific test file
npm run test:e2e e2e/auth/login.spec.ts
```

## Test Structure

```
e2e/
├── auth/
│   ├── fixtures.ts              # Mock API responses for auth testing
│   ├── login.spec.ts            # Login flow tests (11 tests)
│   ├── signup.spec.ts           # Signup flow tests (12 tests)
│   └── password-reset.spec.ts   # Password reset flow tests (16 tests)
└── setup/
```

## Test Coverage

### Login Tests (`auth/login.spec.ts`)

- ✅ Display login form
- ✅ Successful login with valid credentials
- ✅ Error handling for invalid credentials
- ✅ Error handling for unverified email
- ✅ Email format validation
- ✅ Password length validation
- ✅ Required field validation
- ✅ Remember me checkbox functionality
- ✅ Navigation to signup page
- ✅ Navigation to forgot password page
- ✅ Loading state during submission

### Signup Tests (`auth/signup.spec.ts`)

- ✅ Display signup form
- ✅ Successful signup with valid data
- ✅ Error handling for existing email
- ✅ Full name length validation
- ✅ Email format validation
- ✅ Password requirements validation
- ✅ Password complexity validation
- ✅ Password matching validation
- ✅ Terms acceptance requirement
- ✅ Password strength indicator
- ✅ Navigation to login page
- ✅ Loading state during submission
- ✅ Links to terms and privacy policy

### Password Reset Tests (`auth/password-reset.spec.ts`)

**Forgot Password Flow:**

- ✅ Display forgot password form
- ✅ Successful password reset request
- ✅ Email format validation
- ✅ Required email field
- ✅ Loading state during submission
- ✅ Navigation back to login
- ✅ Send another reset link functionality

**Reset Password Flow:**

- ✅ Display reset password form with valid token
- ✅ Successful password reset
- ✅ Password requirements validation
- ✅ Password complexity validation
- ✅ Password matching validation
- ✅ Password strength indicator
- ✅ Loading state during submission
- ✅ Countdown and redirect to login
- ✅ Navigation back to login

**Invalid Token Handling:**

- ✅ Show error for missing token
- ✅ Navigate to forgot password from invalid token page

## Mock API Responses

All tests use mocked API responses defined in `auth/fixtures.ts`. This ensures:

- Fast, reliable tests that don't depend on backend availability
- Predictable test data and scenarios
- Ability to test error cases easily

### Mock Scenarios

**Login:**

- `test@example.com` + `TestPassword123!` → Success
- `unverified@example.com` + any password → Email not verified error
- Any other credentials → Invalid credentials error

**Signup:**

- `existing@example.com` → Email already exists error
- Any other email → Success

**Forgot Password:**

- Any email → Success (reset link sent)

**Reset Password:**

- `invalid-token` → Invalid token error
- Any other token → Success

## Writing New Tests

### 1. Create a New Feature Directory

```bash
mkdir e2e/documents
```

### 2. Create Fixtures (if needed)

```typescript
// e2e/documents/fixtures.ts
import { test as base } from '@playwright/test';

export const mockDocumentResponses = {
  // Your mock responses
};

export async function setupDocumentMocks(page: Page) {
  // Your mock setup
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await setupDocumentMocks(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

### 3. Create Test Files

```typescript
// e2e/documents/upload.spec.ts
import { test, expect } from './fixtures';

test.describe('Document Upload', () => {
  test('should upload a document', async ({ page }) => {
    // Your test
  });
});
```

### 4. Follow Naming Conventions

- Feature directories: `e2e/feature-name/`
- Test files: `feature-name.spec.ts` or `specific-flow.spec.ts`
- Fixtures: `fixtures.ts` within the feature directory

### 5. Use Semantic Selectors

```typescript
// ✅ Good - semantic selectors
await page.click('button[type="submit"]');
await page.locator('text=Sign in').click();
await page.getByRole('button', { name: 'Submit' }).click();

// ❌ Avoid - brittle CSS selectors
await page.click('.btn-primary');
await page.click('#submit-button');
```

### 6. Use data-testid for Stable Selectors

When semantic selectors aren't sufficient:

```tsx
// Component
<button data-testid="submit-button">Submit</button>;

// Test
await page.getByTestId('submit-button').click();
```

## CI Integration

The Playwright config (`playwright.config.ts`) is set up for CI:

- Retry failed tests 2 times on CI
- Run tests sequentially on CI (`workers: 1`)
- Automatically start dev server before tests
- Generate HTML and list reports

## Debugging Tips

### 1. Use UI Mode for Development

```bash
npm run test:e2e:ui
```

This provides:

- Time-travel debugging
- Watch mode
- Pick locators visually
- See test traces

### 2. Use Debug Mode

```bash
npm run test:e2e:debug
```

Step through tests line by line with Playwright Inspector.

### 3. Screenshots on Failure

Screenshots are automatically saved to `test-results/` on failure.

### 4. View Traces

Traces are recorded on first retry and can be viewed in the HTML report:

```bash
npm run test:e2e:report
```

### 5. Run Specific Tests

```bash
# Run tests matching a pattern
npm run test:e2e -- --grep "login"

# Run a specific test file
npm run test:e2e e2e/auth/login.spec.ts

# Run a specific test
npm run test:e2e -- --grep "should successfully login"
```

## Best Practices

### Test Isolation

- ✅ Each test should be independent
- ✅ Use `beforeEach` to set up clean state
- ✅ Don't rely on test execution order

### Selectors

- ✅ Use role-based selectors (`getByRole`)
- ✅ Use text content (`text=...`)
- ✅ Use `data-testid` for complex elements
- ❌ Avoid CSS class selectors (they change often)

### Assertions

- ✅ Use auto-retrying assertions (`expect(locator).toBeVisible()`)
- ✅ Add timeouts for async operations
- ✅ Test user-visible behavior, not implementation

### Mock Data

- ✅ Mock API responses for predictable tests
- ✅ Test both success and error scenarios
- ✅ Keep mock data in fixtures

### Organization

- ✅ Group related tests with `test.describe`
- ✅ Use descriptive test names
- ✅ One feature per directory
- ✅ Keep fixtures with feature tests

### User Focus

- ✅ Test user flows, not implementation details
- ✅ Validate loading states and feedback
- ✅ Test keyboard navigation
- ✅ Check ARIA labels and accessibility

## Adding New Features

When adding tests for new features (e.g., documents, spaces, queries):

1. Create feature directory: `e2e/documents/`
2. Add fixtures: `e2e/documents/fixtures.ts`
3. Write tests: `e2e/documents/*.spec.ts`
4. Update this README with coverage

Example structure after adding more features:

```
e2e/
├── auth/
│   ├── fixtures.ts
│   ├── login.spec.ts
│   ├── signup.spec.ts
│   └── password-reset.spec.ts
├── documents/
│   ├── fixtures.ts
│   ├── upload.spec.ts
│   ├── list.spec.ts
│   └── delete.spec.ts
├── spaces/
│   ├── fixtures.ts
│   ├── create.spec.ts
│   └── manage.spec.ts
└── queries/
    ├── fixtures.ts
    └── natural-language.spec.ts
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)
