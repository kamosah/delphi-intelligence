import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DocumentsClient } from '@/components/documents/DocumentsClient';
import { DocumentSortField, SortOrder } from '@/lib/api/generated';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import {
  fetchDocuments,
  getCurrentOrganizationId,
} from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DocumentsPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Get current organization ID to match client query key
  const currentOrgId = await getCurrentOrganizationId();

  // Default sort matches DocumentTable initial state
  const defaultSort = {
    field: DocumentSortField.CreatedAt,
    order: SortOrder.Desc,
  };

  // Prefetch all documents (across all spaces) for instant page load
  // Query key must EXACTLY match client's initial fetch for proper hydration
  // Client initial state (from DocumentTable.tsx via DocumentsClient):
  // - spaceId: null (no spaceId prop passed, useDocuments line 190 + 206)
  // - limit: 100, offset: 0 (useDocuments defaults)
  // - organizationId: currentOrganization?.id (from Zustand)
  // - filters: undefined (no user input yet)
  // - sort: { field: CREATED_AT, order: DESC } (default sorting)
  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(null, {
        limit: 100,
        offset: 0,
        organizationId: currentOrgId,
        filters: undefined,
        sort: defaultSort,
      }),
      queryFn: () =>
        fetchDocuments(graphqlClient, {
          limit: 100,
          offset: 0,
          sort: defaultSort,
        }),
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
