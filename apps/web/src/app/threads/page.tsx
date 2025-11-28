import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { ThreadsClient } from '@/components/threads/ThreadsClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchThreads } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

/**
 * Top-level Threads page - org-wide conversational AI interface.
 *
 * Features:
 * - ThreadInterface shows immediately (no space selection)
 * - Org-wide thread creation and queries
 * - ThreadsSidebar shows recent threads and bookmarks (SSR prefetched!)
 * - Uses currentOrganization from Zustand auth store
 * - Navigates to individual thread page after first message
 *
 * SSR Optimization:
 * - Prefetches threads for both sidebar and main content
 * - No loading skeleton on initial page load
 */
export default async function ThreadsPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Prefetch threads for sidebar (recent threads + bookmarks)
  // Limit: 50 matches ThreadsNavigation query
  await queryClient.prefetchQuery({
    queryKey: queryKeys.threads.list({
      organizationId: null,
      limit: 50,
      offset: 0,
    }),
    queryFn: () =>
      fetchThreads(graphqlClient, {
        organizationId: null,
        limit: 50,
        offset: 0,
      }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ThreadsClient />
    </HydrationBoundary>
  );
}
