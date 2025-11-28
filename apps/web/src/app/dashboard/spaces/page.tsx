import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { SpacesClient } from '@/components/spaces/SpacesClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchSpaces } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function SpacesPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Prefetch spaces list for instant page load
  // Wrapped in try-catch: if prefetch fails, page still renders and client will fetch
  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.spaces.list({ limit: 100, offset: 0 }),
      queryFn: () => fetchSpaces(graphqlClient, { limit: 100, offset: 0 }),
    });
  } catch (error) {
    // Log error but allow page to render - client-side queries will fetch data as needed
    console.error('Spaces SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesClient />
    </HydrationBoundary>
  );
}
