import { expect, test } from './fixtures';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('should display signup form', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Sign up | Olympus');

    // Check form elements are present
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Should have 2 password fields (password and confirm)
    const passwordFields = page.locator('input[type="password"]');
    await expect(passwordFields).toHaveCount(2);

    await expect(
      page.locator('input[type="checkbox"][id="acceptTerms"]')
    ).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should successfully signup with valid data', async ({ page }) => {
    // Fill in signup form
    await page.fill('input[name="fullName"]', 'New User');
    await page.fill('input[type="email"]', 'newuser@example.com');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('TestPassword123!');
    await passwordFields.nth(1).fill('TestPassword123!');

    await page.check('input[type="checkbox"][id="acceptTerms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to verify email page
    await expect(page).toHaveURL(/verify-email/, { timeout: 10000 });
  });

  test('should show error for existing email', async ({ page }) => {
    // Fill in signup form with existing email
    await page.fill('input[name="fullName"]', 'Existing User');
    await page.fill('input[type="email"]', 'existing@example.com');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('TestPassword123!');
    await passwordFields.nth(1).fill('TestPassword123!');

    await page.check('input[type="checkbox"][id="acceptTerms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=Email already registered')).toBeVisible();
  });

  test('should validate full name length', async ({ page }) => {
    // Fill in short name
    await page.fill('input[name="fullName"]', 'A');
    await page.fill('input[type="email"]', 'test@example.com');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('text=Full name must be at least 2 characters')
    ).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Fill in invalid email and blur to trigger validation
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[type="email"]', 'invalid-email');

    // Blur to trigger validation
    await page.locator('input[type="email"]').blur();

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    // Fill form with weak password
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('weak');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();
  });

  test('should validate password complexity', async ({ page }) => {
    // Fill form with simple password
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('password123');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error for missing uppercase
    await expect(
      page.locator('text=Password must contain at least one uppercase letter')
    ).toBeVisible();
  });

  test('should validate passwords match', async ({ page }) => {
    // Fill form with mismatched passwords
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('TestPassword123!');
    await passwordFields.nth(1).fill('DifferentPassword123!');

    await page.check('input[type="checkbox"][id="acceptTerms"]');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator("text=Passwords don't match")).toBeVisible();
  });

  test('should require terms acceptance', async ({ page }) => {
    // Fill form without accepting terms
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('TestPassword123!');
    await passwordFields.nth(1).fill('TestPassword123!');

    // Try to submit without checking terms
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('text=You must accept the terms and conditions')
    ).toBeVisible();
  });

  test('should display password strength indicator', async ({ page }) => {
    const passwordField = page.locator('input[type="password"]').first();

    // Type a password that has low strength (will show "Weak")
    // "password" = 8 chars (1 point), lowercase only, no special = strength 1 = Weak
    await passwordField.fill('password');

    // Wait a moment for strength indicator to render
    await page.waitForTimeout(100);

    // Password strength indicator should be visible with "Weak" label
    await expect(page.locator('text=Password strength:')).toBeVisible({
      timeout: 2000,
    });
    await expect(page.locator('text=Weak')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Click login link
    await page.click('text=Sign in');

    // Should navigate to login
    await expect(page).toHaveURL('/login');
  });

  test('should have links to terms and privacy policy', async ({ page }) => {
    // Check terms link
    const termsLink = page.locator('a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toContainText('Terms of Service');

    // Check privacy link
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toContainText('Privacy Policy');
  });
});
