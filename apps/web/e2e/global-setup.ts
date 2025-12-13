import { supabaseService } from './lib/supabase-test-client';

/**
 * Global setup - runs once before all E2E tests.
 *
 * Creates shared test users for authentication in parallel tests.
 * Each worker gets its own test user (worker-0, worker-1, worker-2).
 */
export default async function globalSetup() {
  console.log('🔧 Global setup: Creating test users...');

  const testUsers = [
    { email: 'worker-0@example.com', password: 'TestPassword123!' },
    { email: 'worker-1@example.com', password: 'TestPassword123!' },
    { email: 'worker-2@example.com', password: 'TestPassword123!' },
    { email: 'admin@example.com', password: 'TestPassword123!', role: 'admin' },
  ];

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers } =
        await supabaseService.auth.admin.listUsers();
      const exists = existingUsers?.users.some((u) => u.email === user.email);

      if (!exists) {
        const { error } = await supabaseService.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm for testing
        });

        if (error) {
          console.error(
            `❌ Failed to create user ${user.email}:`,
            error.message
          );
        } else {
          console.log(`✅ Created test user: ${user.email}`);
        }
      } else {
        console.log(`⏭️  User already exists: ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Error processing user ${user.email}:`, error);
    }
  }

  console.log('✅ Global setup complete');
}
