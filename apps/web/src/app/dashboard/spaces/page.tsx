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
  await queryClient.prefetchQuery({
    queryKey: queryKeys.spaces.list({ limit: undefined, offset: undefined }),
    queryFn: () => fetchSpaces(graphqlClient),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesClient />
    </HydrationBoundary>
  );
}
