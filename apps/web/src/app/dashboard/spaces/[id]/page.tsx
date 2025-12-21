import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { SpaceDetailClient } from '@/components/spaces/SpaceDetailClient';
import { DocumentSortField, SortOrder } from '@/lib/api/generated';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import {
  fetchDocuments,
  getCurrentOrganizationId,
} from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

interface SpaceDetailPageProps {
  params: { id: string };
}

export default async function SpaceDetailPage({
  params,
}: SpaceDetailPageProps) {
  const spaceId = params.id;
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Get current organization ID to match client query key
  const currentOrgId = await getCurrentOrganizationId();

  // Default sort matches DocumentTable initial state (line 48-49: { id: 'createdAt', desc: true })
  const defaultSort = {
    field: DocumentSortField.CreatedAt,
    order: SortOrder.Desc,
  };

  // Prefetch documents for this space for instant page load
  // Query key must EXACTLY match client's initial fetch for proper hydration
  // Client initial state (from DocumentTable.tsx):
  // - limit: 100, offset: 0 (useDocuments defaults, lines 192-193)
  // - organizationId: currentOrganization?.id (from Zustand, line 191)
  // - filters: undefined (graphqlFilters is undefined when no user input, line 91-92)
  // - sort: { field: CREATED_AT, order: DESC } (default sorting, lines 64-78)
  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(spaceId, {
        limit: 100,
        offset: 0,
        organizationId: currentOrgId,
        filters: undefined,
        sort: defaultSort,
      }),
      queryFn: () =>
        fetchDocuments(graphqlClient, {
          spaceId,
          limit: 100,
          offset: 0,
          sort: defaultSort,
        }),
    });
  } catch (error) {
    // Log error but allow page to render - client-side queries will fetch data as needed
    console.error('Space documents SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpaceDetailClient spaceId={spaceId} />
    </HydrationBoundary>
  );
}
