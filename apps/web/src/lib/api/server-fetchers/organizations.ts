/**
 * Server-side fetchers for organizations.
 *
 * Use in Server Components for SSR data prefetching.
 */

import type { GraphQLClient } from 'graphql-request';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import {
  GetOrganizationsDocument,
  type GetOrganizationsQuery,
  GetOrganizationMembersDocument,
  type GetOrganizationMembersQuery,
} from '@/lib/api/hooks.generated';

/**
 * Get current organization ID (server-side only).
 *
 * Backend returns organizations in correct order:
 * 1. is_default DESC NULLS LAST
 * 2. last_active_at DESC NULLS LAST
 * 3. created_at ASC
 *
 * So current org is always the first one in the list.
 * This matches client-side logic in `useOrganizations()` hook.
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

    // Backend guarantees correct order, so first org is the current one
    return organizations[0].id;
  } catch (error) {
    console.error('Failed to fetch current organization ID:', error);
    return null;
  }
}

/**
 * Fetch organization members (server-side only).
 *
 * Used in Server Components for SSR data prefetching of organization members.
 * Query key must match client-side hook for proper hydration.
 *
 * @param client - GraphQL client instance from getServerGraphQLClient()
 * @param options - Query options with organizationId, limit, and offset
 * @returns Organization members query result
 *
 * @example
 * ```typescript
 * // In Server Component (e.g., settings/organizations/[orgId]/members/page.tsx)
 * import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
 * import { fetchOrganizationMembers } from '@/lib/api/server-fetchers';
 * import { queryKeys } from '@/lib/query/query-keys';
 *
 * const graphqlClient = await getServerGraphQLClient();
 * await queryClient.prefetchQuery({
 *   queryKey: queryKeys.organizationMembers.list(organizationId, { limit, offset }),
 *   queryFn: () => fetchOrganizationMembers(graphqlClient, { organizationId, limit, offset }),
 * });
 * ```
 */
export async function fetchOrganizationMembers(
  client: GraphQLClient,
  options: {
    organizationId: string;
    limit?: number;
    offset?: number;
  }
): Promise<GetOrganizationMembersQuery> {
  return client.request<GetOrganizationMembersQuery>(
    GetOrganizationMembersDocument,
    {
      organizationId: options.organizationId,
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    }
  );
}
