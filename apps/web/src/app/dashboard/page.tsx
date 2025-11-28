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
  // Wrapped in try-catch: if prefetch fails, page still renders and client will fetch
  try {
    await Promise.all([
      // Prefetch dashboard stats (counts for documents, spaces, threads)
      // TODO (LOG-227): Query key mismatch - server uses organizationId: null but client uses
      // currentOrganization?.id from Zustand. This causes hydration failure and duplicate requests.
      // Fix: Read current_organization_id from user_preferences table in Server Component.
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(null),
        queryFn: () =>
          fetchDashboardStats(graphqlClient, { organizationId: null }),
      }),

      // Prefetch recent documents (top 3)
      queryClient.prefetchQuery({
        queryKey: queryKeys.documents.list(null, { limit: 3, offset: 0 }),
        queryFn: () => fetchDocuments(graphqlClient, { limit: 3, offset: 0 }),
      }),

      // Prefetch recent threads (top 3)
      // TODO (LOG-227): Query key mismatch - server uses organizationId: null but client uses
      // currentOrganization?.id from Zustand. This causes hydration failure and duplicate requests.
      // Fix: Read current_organization_id from user_preferences table in Server Component.
      queryClient.prefetchQuery({
        queryKey: queryKeys.threads.list({
          organizationId: null,
          limit: 3,
          offset: 0,
        }),
        queryFn: () =>
          fetchThreads(graphqlClient, {
            organizationId: null,
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
