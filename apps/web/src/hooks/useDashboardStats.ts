'use client';

import { useGetDashboardStatsQuery } from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

// Re-export generated types
export type { DashboardStats } from '@/lib/api/generated';

/**
 * Fetch dashboard statistics for the authenticated user.
 *
 * Returns efficient COUNT queries for documents, spaces, threads, and threads this month.
 * Automatically scopes to the current organization if one is selected.
 *
 * @param options - Optional configuration
 * @param options.organizationId - Optional organization ID to scope stats to
 */
export function useDashboardStats(options?: {
  organizationId?: string | null;
}) {
  const { accessToken, currentOrganization, isOrgSynced } = useAuthStore();

  // Use provided organizationId or fall back to currentOrganization
  const orgId = options?.organizationId ?? currentOrganization?.id;

  const query = useGetDashboardStatsQuery(
    {
      organizationId: orgId || undefined,
    },
    {
      // Wait for both auth token AND org sync to prevent stale org ID queries
      enabled: !!accessToken && isOrgSynced,
      queryKey: queryKeys.dashboard.stats(orgId),
      // Keep stats fresh but not too aggressive
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute in the background
    }
  );

  return {
    stats: query.data?.dashboardStats || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
