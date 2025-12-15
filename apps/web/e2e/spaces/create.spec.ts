import { test, expect } from '../fixtures';
import { createTestOrganization } from '../lib/test-data';

test.describe('Spaces - Create', () => {
  test('should create new space via UI', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // 1. Get user's default organization (created in global-setup)
    const { data: userOrg, error: orgError } = await supaService
      .from('organizations')
      .select('*')
      .eq('owner_id', authenticatedUserId)
      .limit(1)
      .single();

    if (orgError || !userOrg) {
      throw new Error(
        `Failed to find user's default organization: ${orgError?.message}`
      );
    }

    // 2. Navigate to spaces page
    await authenticatedPage.goto('/dashboard/spaces');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for organization switcher to show the actual org name (not "Select organization")
    // More specific selector than generic button
    await expect(
      authenticatedPage.locator('button', { hasText: userOrg.name })
    ).toBeVisible({ timeout: 15000 });

    // 3. Click "New Space" button
    await authenticatedPage.getByTestId('new-space-button').click();

    // Wait for dialog to be visible before interacting with form
    await authenticatedPage.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout: 5000,
    });

    // 4. Fill in space form
    const spaceName = `Test Space ${workerId}-${Date.now()}`;
    const spaceDescription = `Test space for worker ${workerId}`;

    // Use data-testid selectors for stable test selection
    await authenticatedPage.getByTestId('space-name-input').fill(spaceName);
    await authenticatedPage
      .getByTestId('space-description-input')
      .fill(spaceDescription);

    // Icon color is selected by default, no need to change

    // 5. Submit form
    await authenticatedPage.getByTestId('space-form-submit-button').click();

    // 6. Verify: Space appears in UI
    // Should redirect to space page or show success message
    await authenticatedPage.waitForURL(/\/dashboard\/spaces\/.+/, {
      timeout: 10000,
    });
    await expect(authenticatedPage.getByText(spaceName)).toBeVisible();

    // 7. Verify: Space exists in database with correct FK relationships
    const { data: space, error } = await supaService
      .from('spaces')
      .select('*')
      .eq('name', spaceName)
      .single();

    expect(error).toBeNull();
    expect(space).toBeDefined();
    expect(space.name).toBe(spaceName);
    expect(space.description).toBe(spaceDescription);
    expect(space.organization_id).toBe(userOrg.id);
    expect(space.owner_id).toBe(authenticatedUserId);

    // Cleanup: Automatic via Supawright - org and space will be deleted
  });

  test('should show validation errors for invalid input', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create organization
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    // Navigate to spaces page and open new space modal
    await authenticatedPage.goto('/dashboard/spaces');
    await authenticatedPage.waitForLoadState('networkidle');

    // Click "New Space" button to open modal
    await authenticatedPage.getByTestId('new-space-button').click();

    // Wait for dialog to open
    await authenticatedPage.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout: 5000,
    });

    // Try to submit empty form
    await authenticatedPage.getByTestId('space-form-submit-button').click();

    // Verify: Validation errors appear
    await expect(
      authenticatedPage.getByText(/name is required/i)
    ).toBeVisible();

    // Verify: No space was created
    const { data: spaces } = await supaService
      .from('spaces')
      .select('count')
      .eq('organization_id', org.id);

    expect(spaces?.[0]?.count || 0).toBe(0);
  });

  test('should list all user spaces', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create organization
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    // Create multiple spaces in parallel for efficiency
    const spaceCount = 3;
    const timestamp = Date.now();

    const spaceCreationPromises = Array.from({ length: spaceCount }, (_, i) =>
      supaService
        .from('spaces')
        .insert({
          name: `Test Space ${workerId}-${i}-${timestamp}`,
          slug: `test-space-${workerId}-${i}-${timestamp}`,
          description: `Test space ${i}`,
          organization_id: org.id,
          owner_id: authenticatedUserId,
        })
        .select()
        .single()
    );

    const results = await Promise.all(spaceCreationPromises);
    const createdSpaces = results.map((r) => r.data).filter(Boolean);

    // Navigate to spaces list
    await authenticatedPage.goto('/dashboard/spaces');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify: All spaces appear in the list (check in parallel for efficiency)
    await Promise.all(
      createdSpaces.map((space) =>
        expect(authenticatedPage.getByText(space.name)).toBeVisible({
          timeout: 10000,
        })
      )
    );

    // Verify: Space count is correct
    const spaceCards = authenticatedPage.locator('[data-testid="space-card"]');
    await expect(spaceCards).toHaveCount(spaceCount, { timeout: 5000 });
  });
});
