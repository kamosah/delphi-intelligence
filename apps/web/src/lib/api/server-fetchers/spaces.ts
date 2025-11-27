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
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const spaces = await fetchSpaces(client);
 * ```
 */
export async function fetchSpaces(
  client: GraphQLClient,
  options?: FetchSpacesOptions
): Promise<GetSpacesQuery['spaces']> {
  const result = await client.request<GetSpacesQuery>(GetSpacesDocument, {
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
  });

  return result.spaces;
}
