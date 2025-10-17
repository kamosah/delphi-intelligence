import { expect, test } from './fixtures';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Sign in | Olympus');

    // Check form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Remember me')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in login form with invalid credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message (use .first() to avoid Next.js route announcer)
    const alert = page
      .locator('[role="alert"]')
      .filter({ hasText: 'Invalid email or password' });
    await expect(alert).toBeVisible();
  });

  test('should show error for unverified email', async ({ page }) => {
    // Fill in login form with unverified email
    await page.fill('input[type="email"]', 'unverified@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show email verification error
    const alert = page.locator('[role="alert"]').filter({ hasText: 'verify' });
    await expect(alert).toBeVisible();

    // Should show resend verification button
    await expect(
      page.locator('button:has-text("Resend verification email")')
    ).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Fill in invalid email and blur to trigger validation
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Click outside email field to trigger validation
    await page.locator('input[type="email"]').blur();

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error (React Hook Form validation)
    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should validate password length', async ({ page }) => {
    // Fill in short password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'short');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();
  });

  test('should validate required email field', async ({ page }) => {
    // Fill in only password
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should toggle remember me checkbox', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"][id="rememberMe"]');

    // Check initial state
    await expect(checkbox).not.toBeChecked();

    // Click checkbox
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Uncheck
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('should navigate to signup page', async ({ page }) => {
    // Click signup link (use more specific selector)
    await page.click('a:has-text("Sign up")');

    // Should navigate to signup
    await expect(page).toHaveURL('/signup');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Click forgot password link
    await page.click('text=Forgot password?');

    // Should navigate to forgot password
    await expect(page).toHaveURL('/forgot-password');
  });
});
