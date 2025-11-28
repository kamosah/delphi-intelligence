import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DocumentsClient } from '@/components/documents/DocumentsClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchDocuments } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DocumentsPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Prefetch all documents (across all spaces) for instant page load
  await queryClient.prefetchQuery({
    queryKey: queryKeys.documents.list(null, { limit: 100, offset: 0 }),
    queryFn: () => fetchDocuments(graphqlClient, { limit: 100, offset: 0 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DocumentsClient />
    </HydrationBoundary>
  );
}
