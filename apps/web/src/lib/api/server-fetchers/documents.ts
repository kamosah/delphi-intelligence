/**
 * Server-side fetchers for documents data.
 * Use in Server Components for SSR prefetching.
 */

import type { GraphQLClient } from 'graphql-request';
import {
  GetDocumentsDocument,
  type GetDocumentsQuery,
} from '../hooks.generated';

export interface FetchDocumentsOptions {
  spaceId?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * Fetch documents list with optional filtering.
 *
 * Returns the full query result to match client-side hook expectations.
 * This ensures proper SSR hydration (server and client have same data structure).
 *
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const data = await fetchDocuments(client, { limit: 50 });
 * ```
 */
export async function fetchDocuments(
  client: GraphQLClient,
  options?: FetchDocumentsOptions
): Promise<GetDocumentsQuery> {
  const result = await client.request<GetDocumentsQuery>(GetDocumentsDocument, {
    spaceId: options?.spaceId ?? null,
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
  });

  return result;
}
