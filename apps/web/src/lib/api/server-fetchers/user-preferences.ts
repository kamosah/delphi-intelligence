/**
 * Server-side fetchers for user preferences and organizations.
 *
 * Use in Server Components for SSR data prefetching.
 */

import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import {
  GetOrganizationsDocument,
  type GetOrganizationsQuery,
  type Organization,
} from '@/lib/api/hooks.generated';

/**
 * Get current organization ID using backend selection logic (server-side only).
 *
 * Uses same logic as backend and useOrganizations:
 * 1. Organization with is_default=true
 * 2. Most recently active (last_active_at DESC)
 * 3. First organization
 *
 * Used in Server Components to determine the correct organizationId
 * for SSR query prefetching, ensuring query keys match between server
 * and client for proper hydration.
 *
 * @returns The current organization ID or null if user has no organizations
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
    const { organizations } =
      await graphqlClient.request<GetOrganizationsQuery>(
        GetOrganizationsDocument,
        { limit: 100, offset: 0 }
      );

    if (!organizations || organizations.length === 0) {
      return null;
    }

    // Priority 1: Organization with is_default=true
    const defaultOrg = organizations.find((org) => org.isDefault === true);
    if (defaultOrg) {
      return defaultOrg.id;
    }

    // Priority 2: Most recently active (last_active_at DESC)
    const recentOrgs = organizations
      .filter((org) => org.lastActiveAt != null)
      .sort(
        (a, b) =>
          new Date(b.lastActiveAt!).getTime() -
          new Date(a.lastActiveAt!).getTime()
      );

    if (recentOrgs.length > 0) {
      return recentOrgs[0].id;
    }

    // Priority 3: First organization
    return organizations[0].id;
  } catch (error) {
    console.error('Failed to fetch current organization ID:', error);
    return null;
  }
}
