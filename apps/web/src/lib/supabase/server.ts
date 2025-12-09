import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase client for Server Components and API routes.
 *
 * This client manages HTTP-only cookies via Next.js cookies() API,
 * providing secure authentication in server-side contexts.
 *
 * The client handles:
 * - Reading HTTP-only cookies from the request
 * - Setting HTTP-only cookies in the response
 * - Automatic session refresh
 *
 * Usage in Server Components:
 * ```typescript
 * const supabase = await createSupabaseServerClient();
 * const { data: { session } } = await supabase.auth.getSession();
 * ```
 *
 * @returns Supabase client configured for server use with HTTP-only cookies
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
