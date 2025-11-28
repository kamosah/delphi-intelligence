/**
 * Server-side fetchers for spaces data.
 * Use in Server Components for SSR prefetching.
 */

import type { GraphQLClient } from 'graphql-request';
import { GetSpacesDocument, type GetSpacesQuery } from '../hooks.generated';

export interface FetchSpacesOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetch spaces list with optional pagination.
 *
 * Returns the full query result to match client-side hook expectations.
 * This ensures proper SSR hydration (server and client have same data structure).
 *
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const data = await fetchSpaces(client);
 * ```
 */
export async function fetchSpaces(
  client: GraphQLClient,
  options?: FetchSpacesOptions
): Promise<GetSpacesQuery> {
  const result = await client.request<GetSpacesQuery>(GetSpacesDocument, {
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
  });
  return result;
}
