/**
 * Server-side fetchers for user preferences.
 *
 * Use in Server Components for SSR data prefetching.
 */

import type { GraphQLClient } from 'graphql-request';
import {
  UserPreferencesDocument,
  type UserPreferencesQuery,
} from '@/lib/api/hooks.generated';

/**
 * Fetch user preferences (server-side only).
 *
 * Used in Server Components for SSR data prefetching of user preferences.
 * Query key must match client-side hook for proper hydration.
 *
 * @param client - GraphQL client instance from getServerGraphQLClient()
 * @returns User preferences query result
 *
 * @example
 * ```typescript
 * // In Server Component (e.g., settings/preferences/page.tsx)
 * import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
 * import { fetchUserPreferences } from '@/lib/api/server-fetchers';
 * import { queryKeys } from '@/lib/query/query-keys';
 *
 * const graphqlClient = await getServerGraphQLClient();
 * await queryClient.prefetchQuery({
 *   queryKey: queryKeys.userPreferences.details(),
 *   queryFn: () => fetchUserPreferences(graphqlClient),
 * });
 * ```
 */
export async function fetchUserPreferences(
  client: GraphQLClient
): Promise<UserPreferencesQuery> {
  return client.request<UserPreferencesQuery>(UserPreferencesDocument, {});
}
