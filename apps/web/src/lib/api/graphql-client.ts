import { useAuthStore } from '@/lib/stores/auth-store';
import { GraphQLClient } from 'graphql-request';

// GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql';

/**
 * Create a GraphQL client with dynamic auth token injection.
 *
 * Uses requestMiddleware to read the current auth token from Zustand store
 * on every request, ensuring the latest token is always used without manual syncing.
 */
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  requestMiddleware: (request) => {
    // Read token fresh from store on each request
    const token = useAuthStore.getState().accessToken;

    if (token) {
      // Create a new Headers object from the existing one
      const headers = new Headers(request.headers);
      headers.set('authorization', `Bearer ${token}`);

      return {
        ...request,
        headers,
      };
    }

    return request;
  },
});

// Helper function to make authenticated requests
export async function makeGraphQLRequest<
  TData = any,
  TVariables extends Record<string, any> = Record<string, any>,
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
  TData = any,
  TVariables extends Record<string, any> = Record<string, any>,
>(
  query: string,
  variables?: TVariables,
  options?: RequestInit['headers']
): () => Promise<TData> {
  return () => makeGraphQLRequest<TData, TVariables>(query, variables, options);
}
