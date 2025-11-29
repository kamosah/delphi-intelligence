/**
 * Server-side fetchers for user preferences.
 *
 * Use in Server Components for SSR data prefetching.
 */

import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import {
  UserPreferencesDocument,
  type UserPreferencesQuery,
} from '@/lib/api/hooks.generated';

/**
 * Get current organization ID from user preferences (server-side only).
 *
 * Used in Server Components to determine the correct organizationId
 * for SSR query prefetching, ensuring query keys match between server
 * and client for proper hydration.
 *
 * @returns The current organization ID or null if not set or not authenticated
 *
 * @example
 * ```typescript
 * // In Server Component (e.g., dashboard/page.tsx)
 * import { getCurrentOrganizationId } from '@/lib/api/server-fetchers';
 *
 * const currentOrgId = await getCurrentOrganizationId();
 * await queryClient.prefetchQuery({
 *   queryKey: queryKeys.dashboard.stats(currentOrgId),
 *   queryFn: () => fetchDashboardStats({ organizationId: currentOrgId }),
 * });
 * ```
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  try {
    const graphqlClient = await getServerGraphQLClient();
    const { userPreferences } =
      await graphqlClient.request<UserPreferencesQuery>(
        UserPreferencesDocument
      );
    return userPreferences?.currentOrganizationId || null;
  } catch (error) {
    console.error('Failed to fetch current organization ID:', error);
    return null;
  }
}
