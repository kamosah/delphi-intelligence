import { supabaseService } from './lib/supabase-test-client';

/**
 * Global teardown - runs once after all E2E tests.
 *
 * Optionally cleans up test users created during testing.
 * Disabled by default for faster dev cycles (set CLEANUP_TEST_USERS=true to enable).
 */
export default async function globalTeardown() {
  console.log('🧹 Global teardown: Cleaning up...');

  // Optional: Delete test users (disabled by default for faster dev cycles)
  const CLEANUP_USERS = process.env.CLEANUP_TEST_USERS === 'true';

  if (CLEANUP_USERS) {
    try {
      const { data } = await supabaseService.auth.admin.listUsers();
      const testUsers = data?.users.filter(
        (u) => u.email?.includes('worker-') || u.email?.includes('@example.com')
      );

      for (const user of testUsers || []) {
        await supabaseService.auth.admin.deleteUser(user.id);
        console.log(`🗑️  Deleted test user: ${user.email}`);
      }

      console.log(`✅ Deleted ${testUsers?.length || 0} test users`);
    } catch (error) {
      console.error('❌ Error cleaning up test users:', error);
    }
  } else {
    console.log(
      '⏭️  Skipping user cleanup (set CLEANUP_TEST_USERS=true to enable)'
    );
  }

  console.log('✅ Global teardown complete');
}
