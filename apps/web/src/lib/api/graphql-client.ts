import { GraphQLClient } from 'graphql-request';

// GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql';

/**
 * Client-side GraphQL client for React components.
 *
 * Authentication flow:
 * 1. Supabase manages HTTP-only cookies automatically
 * 2. Cookies are sent with every request via `credentials: 'include'`
 * 3. Next.js middleware reads Supabase session from HTTP-only cookies
 * 4. Middleware exchanges Supabase token for Olympus JWT
 * 5. Middleware forwards Olympus JWT to GraphQL backend
 *
 * Security benefits:
 * - HTTP-only cookies prevent XSS attacks (tokens inaccessible to JavaScript)
 * - Automatic cookie management (no manual token storage)
 * - SameSite protection against CSRF
 *
 * Note: No manual Authorization header needed - middleware handles token exchange
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
    return await graphqlClient.request<TData>(query, variables, options);
  } catch (error) {
    console.error('GraphQL request failed:', error);
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
