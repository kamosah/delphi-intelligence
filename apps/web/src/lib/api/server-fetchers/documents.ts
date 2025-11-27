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
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const documents = await fetchDocuments(client, { limit: 50 });
 * ```
 */
export async function fetchDocuments(
  client: GraphQLClient,
  options?: FetchDocumentsOptions
): Promise<GetDocumentsQuery['documents']> {
  const result = await client.request<GetDocumentsQuery>(GetDocumentsDocument, {
    spaceId: options?.spaceId ?? null,
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
  });

  return result.documents;
}
