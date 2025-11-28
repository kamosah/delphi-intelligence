import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { LibraryClient } from '@/components/library/LibraryClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchThreads } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

/**
 * Library page - Search and browse all threads
 *
 * Features (planned):
 * - Search threads by keyword
 * - Filter by date, bookmarks, spaces
 * - Grid/list view toggle
 * - Inspired by Perplexity's thread search UI
 *
 * SSR Optimization:
 * - Prefetches threads for sidebar navigation
 * - Future: Prefetch for main library grid/list view
 *
 * TODO: Implement search functionality (see LOG-222)
 */
export default async function LibraryPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Prefetch threads for sidebar navigation
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
      <LibraryClient />
    </HydrationBoundary>
  );
}
