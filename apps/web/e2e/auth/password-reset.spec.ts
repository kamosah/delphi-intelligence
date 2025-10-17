import { expect, test } from './fixtures';

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('should display forgot password form', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Reset Password | Olympus');

    // Check page heading
    await expect(page.locator('text="Reset your password"')).toBeVisible();

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(
      page.locator('button[type="submit"]:has-text("Send reset link")')
    ).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should successfully request password reset', async ({ page }) => {
    // Fill in email
    await page.fill('input[type="email"]', 'test@example.com');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=password reset link')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Fill in invalid email and blur to trigger validation
    await page.fill('input[type="email"]', 'invalid-email');

    // Blur to trigger validation
    await page.locator('input[type="email"]').blur();

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should require email field', async ({ page }) => {
    // Try to submit without email
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should navigate back to login', async ({ page }) => {
    // Click back to login link
    await page.click('a[href="/login"]');

    // Should navigate to login
    await expect(page).toHaveURL('/login');
  });

  test('should allow sending another reset link after success', async ({
    page,
  }) => {
    // Request reset
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=Check your email')).toBeVisible();

    // Should show button to send another link
    const sendAnotherButton = page.locator(
      'button:has-text("Send another link")'
    );
    await expect(sendAnotherButton).toBeVisible();

    // Click to send another
    await sendAnotherButton.click();

    // Should return to form
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Reset Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate with valid token
    await page.goto('/reset-password?token=valid-reset-token');
  });

  test('should display reset password form with valid token', async ({
    page,
  }) => {
    // Check page title
    await expect(page).toHaveTitle('Set New Password | Olympus');

    // Check page heading
    await expect(page.locator('text="Set New Password"')).toBeVisible();

    // Check form elements
    const passwordFields = page.locator('input[type="password"]');
    await expect(passwordFields).toHaveCount(2);

    await expect(
      page.locator('button[type="submit"]:has-text("Reset password")')
    ).toBeVisible();
  });

  test('should successfully reset password', async ({ page }) => {
    // Fill in new password
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('NewPassword123!');
    await passwordFields.nth(1).fill('NewPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Password Reset Complete')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=successfully reset')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    // Fill in weak password
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
    // Fill in simple password
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('password123');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('text=Password must contain at least one uppercase letter')
    ).toBeVisible();
  });

  test('should validate passwords match', async ({ page }) => {
    // Fill in mismatched passwords
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('NewPassword123!');
    await passwordFields.nth(1).fill('DifferentPassword123!');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator("text=Passwords don't match")).toBeVisible();
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

  test('should redirect to login after countdown', async ({ page }) => {
    // Reset password successfully
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('NewPassword123!');
    await passwordFields.nth(1).fill('NewPassword123!');
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=Password Reset Complete')).toBeVisible();

    // Should show countdown
    await expect(
      page.locator('text=/Redirecting to login in \\d+ second/i')
    ).toBeVisible();

    // Should have sign in now button
    await expect(
      page.locator('a[href="/login"]:has-text("Sign in now")')
    ).toBeVisible();
  });

  test('should navigate back to login', async ({ page }) => {
    // Click back to login link
    await page.click('a[href="/login"]');

    // Should navigate to login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Reset Password with Invalid Token', () => {
  test('should show error for missing token', async ({ page }) => {
    // Navigate without token
    await page.goto('/reset-password');

    // Should show invalid link message
    await expect(page.locator('text=Invalid Reset Link')).toBeVisible();
    await expect(page.locator('text=invalid or has expired')).toBeVisible();

    // Should show button to request new link
    await expect(
      page.locator(
        'a[href="/forgot-password"]:has-text("Request new reset link")'
      )
    ).toBeVisible();
  });

  test('should navigate to forgot password from invalid token page', async ({
    page,
  }) => {
    // Navigate without token
    await page.goto('/reset-password');

    // Click request new link
    await page.click('a[href="/forgot-password"]');

    // Should navigate to forgot password
    await expect(page).toHaveURL('/forgot-password');
  });
});
