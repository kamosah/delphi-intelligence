import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import {
  fetchDashboardStats,
  fetchDocuments,
  fetchThreads,
  getCurrentOrganizationId,
} from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DashboardPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Fetch current organization from user_preferences
  // Ensures server and client use the same organizationId for query keys
  const currentOrgId = await getCurrentOrganizationId();

  // Parallel prefetch all 3 queries for instant dashboard load
  // Wrapped in try-catch: if prefetch fails, page still renders and client will fetch
  try {
    await Promise.all([
      // Prefetch dashboard stats with correct organizationId
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(currentOrgId),
        queryFn: () =>
          fetchDashboardStats(graphqlClient, { organizationId: currentOrgId }),
      }),

      // Prefetch recent documents (top 3) with correct organizationId
      queryClient.prefetchQuery({
        queryKey: queryKeys.documents.list(null, {
          limit: 3,
          offset: 0,
          organizationId: currentOrgId,
        }),
        queryFn: () =>
          fetchDocuments(graphqlClient, {
            organizationId: currentOrgId,
            limit: 3,
            offset: 0,
          }),
      }),

      // Prefetch recent threads with correct organizationId
      queryClient.prefetchQuery({
        queryKey: queryKeys.threads.list({
          organizationId: currentOrgId,
          limit: 3,
          offset: 0,
        }),
        queryFn: () =>
          fetchThreads(graphqlClient, {
            organizationId: currentOrgId,
            limit: 3,
            offset: 0,
          }),
      }),
    ]);
  } catch (error) {
    // Log error but allow page to render - client-side queries will fetch data as needed
    console.error('Dashboard SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
