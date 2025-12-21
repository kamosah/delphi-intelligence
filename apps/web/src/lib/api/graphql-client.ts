import { GraphQLClient } from 'graphql-request';
import { getQueryClient } from '@/lib/query/provider';
import { queryKeys } from '@/lib/query/query-keys';
import { createClient } from '@/lib/supabase/client';
import { handleAuthError } from '@/lib/utils/auth-error-handler';

// GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Client-side GraphQL client for React components.
 *
 * Authentication flow:
 * 1. Supabase manages HTTP-only cookies automatically
 * 2. makeGraphQLRequest() reads Supabase session from HTTP-only cookies
 * 3. Exchanges Supabase token for Olympus JWT (cached in React Query)
 * 4. Injects Olympus JWT into GraphQL request Authorization header
 *
 * Security benefits:
 * - HTTP-only cookies prevent XSS attacks (tokens inaccessible to JavaScript)
 * - Short-lived Olympus tokens (5-min TTL, cached for 4 min)
 * - Automatic token refresh via React Query staleTime
 * - SameSite protection against CSRF
 */
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  credentials: 'include', // Send HTTP-only cookies automatically
});

// Helper function to make authenticated requests
export async function makeGraphQLRequest<
  TData = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string,
  variables?: TVariables,
  options?: RequestInit['headers']
): Promise<TData> {
  try {
    // Get Supabase session from HTTP-only cookies
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session');
    }

    // Get QueryClient for token caching
    const queryClient = getQueryClient();

    // Check cache for Olympus token (using query key factory)
    const cacheKey = queryKeys.auth.clientToken();
    let olympusToken = queryClient.getQueryData<string>(cacheKey);

    if (!olympusToken) {
      // Cache miss - exchange Supabase token for Olympus JWT
      const response = await fetch(`${API_URL}/auth/client-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Failed to fetch client token: ${errorText}`);

        // Check for auth errors (401/403) and trigger auto-logout
        if (response.status === 401 || response.status === 403) {
          await handleAuthError(error);
        }

        throw error;
      }

      const data = await response.json();
      olympusToken = data.client_token;

      // Cache the token with 4-min staleTime (matches useClientToken hook)
      queryClient.setQueryData(cacheKey, olympusToken, {
        updatedAt: Date.now(),
      });
    }

    // Make GraphQL request with Olympus JWT in Authorization header
    return await graphqlClient.request<TData>(query, variables, {
      ...options,
      Authorization: `Bearer ${olympusToken}`,
    });
  } catch (error) {
    console.error('GraphQL request failed:', error);

    // Check for auth errors and trigger auto-logout
    await handleAuthError(error);

    throw error;
  }
}

// React Query v5 compatible fetcher - returns a function that React Query can call
export function graphqlRequestFetcher<
  TData = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string,
  variables?: TVariables,
  options?: RequestInit['headers']
): () => Promise<TData> {
  return () => makeGraphQLRequest<TData, TVariables>(query, variables, options);
}
