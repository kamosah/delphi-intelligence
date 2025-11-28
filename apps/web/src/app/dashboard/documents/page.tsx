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
  // Wrapped in try-catch: if prefetch fails, page still renders and client will fetch
  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(null, { limit: 100, offset: 0 }),
      queryFn: () => fetchDocuments(graphqlClient, { limit: 100, offset: 0 }),
    });
  } catch (error) {
    // Log error but allow page to render - client-side queries will fetch data as needed
    console.error('Documents SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DocumentsClient />
    </HydrationBoundary>
  );
}
