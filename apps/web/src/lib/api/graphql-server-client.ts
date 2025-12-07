import { GraphQLClient } from 'graphql-request';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get authenticated GraphQL client for Server Components.
 *
 * This utility encapsulates the hybrid authentication flow:
 * 1. Checks Supabase session (HTTP-only cookies)
 * 2. Exchanges Supabase token for Olympus JWT
 * 3. Returns GraphQL client with Olympus JWT in Authorization header
 *
 * Benefits:
 * - HTTP-only cookies protect against XSS attacks
 * - Single utility call eliminates repetitive auth code in Server Components
 * - Automatic redirect to /login if not authenticated
 * - Seamless token exchange between Supabase and Olympus systems
 *
 * Usage in Server Components:
 * ```typescript
 * const graphqlClient = await getServerGraphQLClient();
 * const data = await fetchSpaces(graphqlClient);
 * ```
 *
 * @returns Authenticated GraphQL client with Olympus JWT
 * @throws Redirects to /login if no Supabase session exists
 */
export async function getServerGraphQLClient(): Promise<GraphQLClient> {
  const supabase = await createClient();

  // Check authentication (HTTP-only cookies managed by Supabase)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Exchange Supabase token for Olympus JWT
  try {
    const exchangeResponse = await fetch(`${API_URL}/auth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: 'no-store',
    });

    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      console.error(
        '[getServerGraphQLClient] Token exchange failed:',
        errorText
      );
      redirect('/login');
    }

    const { olympus_token } = await exchangeResponse.json();

    // Return GraphQL client with Olympus JWT
    return new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${olympus_token}`,
      },
    });
  } catch (error) {
    console.error('[getServerGraphQLClient] Token exchange error:', error);
    redirect('/login');
  }
}
