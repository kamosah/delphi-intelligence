/**
 * Server-side fetchers for dashboard data.
 * Use in Server Components for SSR prefetching.
 */

import type { GraphQLClient } from 'graphql-request';
import {
  GetDashboardStatsDocument,
  type DashboardStats,
} from '../hooks.generated';

export interface FetchDashboardStatsOptions {
  organizationId?: string | null;
}

/**
 * Fetch dashboard statistics (document count, space count, thread count).
 *
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const stats = await fetchDashboardStats(client, { organizationId: 'org-123' });
 * ```
 */
export async function fetchDashboardStats(
  client: GraphQLClient,
  options?: FetchDashboardStatsOptions
): Promise<DashboardStats> {
  const result = await client.request<{
    dashboardStats: DashboardStats;
  }>(GetDashboardStatsDocument, {
    organizationId: options?.organizationId ?? null,
  });

  return result.dashboardStats;
}
