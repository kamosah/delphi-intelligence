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
} from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DashboardPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Parallel prefetch all 3 queries for instant dashboard load
  await Promise.all([
    // Prefetch dashboard stats (counts for documents, spaces, threads)
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(null),
      queryFn: () =>
        fetchDashboardStats(graphqlClient, { organizationId: null }),
    }),

    // Prefetch recent documents (top 3)
    queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(null, { limit: 3 }),
      queryFn: () => fetchDocuments(graphqlClient, { limit: 3 }),
    }),

    // Prefetch recent threads (top 3)
    queryClient.prefetchQuery({
      queryKey: queryKeys.threads.list({ limit: 3 }),
      queryFn: () => fetchThreads(graphqlClient, { limit: 3 }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
