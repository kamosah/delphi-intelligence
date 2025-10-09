import { GraphQLClient } from 'graphql-request';

// GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql';

// Create a GraphQL client instance
let graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);

// Function to set the authentication token
export function setAuthToken(token: string) {
  if (token) {
    graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  } else {
    // Clear token by creating a new client without auth headers
    graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);
  }
}

// Export the client instance
export { graphqlClient };

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
