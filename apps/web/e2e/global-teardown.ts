import { supabaseService } from './lib/supabase-test-client';

/**
 * Global teardown - runs once after all E2E tests.
 *
 * Automatically cleans up test users created during testing.
 * This ensures a clean slate for the next test run.
 */
export default async function globalTeardown() {
  console.log('🧹 Global teardown: Cleaning up test users...');

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

  console.log('✅ Global teardown complete');
}
