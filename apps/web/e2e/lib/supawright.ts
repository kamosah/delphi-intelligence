import { Supawright } from '@supawright/supawright';
import { supabaseService } from './supabase-test-client';

/**
 * Supawright instance for managing database transactions in E2E tests.
 *
 * Features:
 * - Test-level isolation: Each test runs in its own transaction
 * - Auto-rollback: All database changes are rolled back after each test
 * - No manual cleanup: Supawright handles cleanup automatically
 *
 * Usage:
 * ```typescript
 * import { supawright } from './lib/supawright';
 *
 * test('my test', async ({ page }) => {
 *   await supawright.startTransaction();
 *   // ... test operations
 *   await supawright.rollback(); // Auto-rollback
 * });
 * ```
 */
export const supawright = new Supawright({
  client: supabaseService,
  // Isolate each test with its own transaction
  isolationLevel: 'test',
  // Auto-rollback after each test
  autoRollback: true,
});
