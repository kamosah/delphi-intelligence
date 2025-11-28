/**
 * Server-side fetchers for threads data.
 * Use in Server Components for SSR prefetching.
 */

import type { GraphQLClient } from 'graphql-request';
import { GetThreadsDocument, type GetThreadsQuery } from '../hooks.generated';

export interface FetchThreadsOptions {
  spaceId?: string | null;
  organizationId?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * Fetch threads list with optional filtering.
 *
 * Returns the full query result to match client-side hook expectations.
 * This ensures proper SSR hydration (server and client have same data structure).
 *
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const data = await fetchThreads(client, { organizationId: 'org-123', limit: 3 });
 * ```
 */
export async function fetchThreads(
  client: GraphQLClient,
  options?: FetchThreadsOptions
): Promise<GetThreadsQuery> {
  const result = await client.request<GetThreadsQuery>(GetThreadsDocument, {
    spaceId: options?.spaceId ?? null,
    organizationId: options?.organizationId ?? null,
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
  });

  return result;
}
