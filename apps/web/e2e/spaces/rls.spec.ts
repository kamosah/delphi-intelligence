import { test, expect } from '../fixtures';
import {
  verifyRLSBlocked,
  verifyRLSAllowed,
  verifyOrganizationIsolation,
} from '../lib/rls-helpers';
import { createTestOrganization, createTestSpace } from '../lib/test-data';

test.describe('Spaces - RLS Policies', () => {
  test('should only allow user to see spaces in their organization', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
    supabase,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create organization and space for current user
    const myOrg = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const mySpace = await createTestSpace(
      supaService,
      workerId,
      myOrg.id,
      authenticatedUserId
    );

    // Get a different test user's ID for RLS testing
    // Use admin@example.com as the "other user" to test RLS isolation
    const { data: otherAuthUser } = await supaService.auth.admin.listUsers();
    const otherUserAuth = otherAuthUser?.users.find(
      (u) => u.email === 'admin@example.com'
    );

    if (!otherUserAuth) {
      throw new Error('Could not find admin test user for RLS testing');
    }

    // Get the public.users.id for the other user
    const { data: otherPublicUser } = await supaService
      .from('users')
      .select('id')
      .eq('auth_user_id', otherUserAuth.id)
      .single();

    if (!otherPublicUser) {
      throw new Error('Could not find public user record for admin user');
    }

    const otherUserId = otherPublicUser.id;

    // Setup: Create space for a different organization (should be blocked by RLS)
    const otherOrg = await supaService
      .from('organizations')
      .insert({
        name: `Other Org ${workerId}`,
        slug: `other-org-${workerId}-${Date.now()}`,
        owner_id: otherUserId, // Real user ID
      })
      .select()
      .single();

    const otherSpace = await supaService
      .from('spaces')
      .insert({
        name: `Other Space ${workerId}`,
        slug: `other-space-${workerId}-${Date.now()}`,
        description: 'Space from another organization',
        organization_id: otherOrg.data.id,
        owner_id: otherUserId, // Real user ID
      })
      .select()
      .single();

    // Test: User can see their own space in UI
    await authenticatedPage.goto(`/spaces/${mySpace.id}`);
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.getByText(mySpace.name)).toBeVisible();

    // Test: User CANNOT see other organization's space (RLS blocks)
    await authenticatedPage.goto(`/spaces/${otherSpace.data.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Should show access denied or 404 page
    const accessDenied = authenticatedPage.getByText(
      /access denied|not found|404/i
    );
    await expect(accessDenied).toBeVisible({ timeout: 5000 });

    // Verify: RLS policy blocks database-level access to other org's space
    const blocked = await verifyRLSBlocked(
      supabase,
      'spaces',
      otherSpace.data.id
    );
    expect(blocked.isBlocked).toBe(true);

    // Verify: RLS policy allows access to own space
    const allowed = await verifyRLSAllowed(supabase, 'spaces', mySpace.id);
    expect(allowed.isAllowed).toBe(true);
    expect(allowed.data).toBeDefined();
  });

  test('should enforce organization isolation at database level', async ({
    authenticatedUserId,
    supaService,
    supabase,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create user's organization with spaces
    const myOrg = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const mySpaceCount = 3;
    for (let i = 0; i < mySpaceCount; i++) {
      await createTestSpace(
        supaService,
        workerId + i,
        myOrg.id,
        authenticatedUserId
      );
    }

    // Setup: Create other organization with spaces
    const otherOrg = await supaService
      .from('organizations')
      .insert({
        name: `Other Org ${workerId}`,
        slug: `other-org-${workerId}-${Date.now()}`,
        owner_id: 'other-user-id',
      })
      .select()
      .single();

    for (let i = 0; i < 2; i++) {
      await supaService.from('spaces').insert({
        name: `Other Space ${workerId}-${i}`,
        slug: `other-space-${workerId}-${i}-${Date.now()}`,
        organization_id: otherOrg.data.id,
        owner_id: 'other-user-id',
      });
    }

    // Test: Verify organization isolation
    const isolation = await verifyOrganizationIsolation(
      supabase,
      'spaces',
      myOrg.id
    );

    expect(isolation.isIsolated).toBe(true);
    expect(isolation.accessibleRecords.length).toBe(mySpaceCount);
    expect(isolation.inaccessibleRecords.length).toBe(0);

    // All accessible records should belong to user's organization
    isolation.accessibleRecords.forEach((record) => {
      expect(record.organization_id).toBe(myOrg.id);
    });
  });

  test('should prevent unauthorized space updates', async ({
    authenticatedUserId: _authenticatedUserId,
    supaService,
    supabase,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create space owned by another user
    const otherOrg = await supaService
      .from('organizations')
      .insert({
        name: `Other Org ${workerId}`,
        slug: `other-org-${workerId}-${Date.now()}`,
        owner_id: 'other-user-id',
      })
      .select()
      .single();

    const otherSpace = await supaService
      .from('spaces')
      .insert({
        name: `Protected Space ${workerId}`,
        slug: `protected-space-${workerId}-${Date.now()}`,
        organization_id: otherOrg.data.id,
        owner_id: 'other-user-id',
      })
      .select()
      .single();

    // Test: Try to update other user's space (should fail)
    const { error: updateError } = await supabase
      .from('spaces')
      .update({ name: 'Hacked Space' })
      .eq('id', otherSpace.data.id);

    // Verify: Update was blocked by RLS
    expect(updateError).toBeTruthy();

    // Verify: Space name unchanged in database
    const { data: unchangedSpace } = await supaService
      .from('spaces')
      .select('name')
      .eq('id', otherSpace.data.id)
      .single();

    expect(unchangedSpace).toBeDefined();
    expect(unchangedSpace?.name).toBe(`Protected Space ${workerId}`);
  });

  test('should prevent unauthorized space deletion', async ({
    authenticatedUserId: _authenticatedUserId,
    supaService,
    supabase,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create space owned by another user
    const otherOrg = await supaService
      .from('organizations')
      .insert({
        name: `Other Org ${workerId}`,
        slug: `other-org-${workerId}-${Date.now()}`,
        owner_id: 'other-user-id',
      })
      .select()
      .single();

    const otherSpace = await supaService
      .from('spaces')
      .insert({
        name: `Protected Space ${workerId}`,
        slug: `protected-space-${workerId}-${Date.now()}`,
        organization_id: otherOrg.data.id,
        owner_id: 'other-user-id',
      })
      .select()
      .single();

    // Test: Try to delete other user's space (should fail)
    const { error: deleteError } = await supabase
      .from('spaces')
      .delete()
      .eq('id', otherSpace.data.id);

    // Verify: Delete was blocked by RLS
    expect(deleteError).toBeTruthy();

    // Verify: Space still exists in database
    const { data: existingSpace } = await supaService
      .from('spaces')
      .select('id')
      .eq('id', otherSpace.data.id)
      .single();

    expect(existingSpace).toBeDefined();
    expect(existingSpace?.id).toBe(otherSpace.data.id);
  });
});
