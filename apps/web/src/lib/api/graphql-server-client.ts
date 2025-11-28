import { cookies } from 'next/headers';
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : 'http://localhost:8000/graphql';

/**
 * Create a server-side GraphQL client with auth token from cookies.
 * Use this ONLY in Server Components.
 *
 * Client-side auth sets the JWT in a cookie named 'olympus-auth-token' via document.cookie.
 * Note: This is NOT an HTTP-only cookie and is accessible to JavaScript (XSS risk).
 * This function reads that cookie and injects it into the Authorization header
 * for authenticated GraphQL requests.
 *
 * @example
 * ```typescript
 * // In Server Component
 * const client = await getServerGraphQLClient();
 * const result = await client.request(GET_SPACES);
 * ```
 */
export async function getServerGraphQLClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('olympus-auth-token')?.value;

  const headers: Record<string, string> = {};
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  return new GraphQLClient(GRAPHQL_ENDPOINT, { headers });
}
