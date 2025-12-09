import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components.
 *
 * This client automatically manages HTTP-only cookies for authentication,
 * providing secure token storage that's inaccessible to JavaScript (XSS protection).
 *
 * Usage:
 * ```typescript
 * const supabase = createClient();
 * const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 * ```
 *
 * @returns Supabase client configured for browser use with HTTP-only cookies
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
