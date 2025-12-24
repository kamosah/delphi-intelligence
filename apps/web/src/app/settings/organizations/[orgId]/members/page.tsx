import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { OrganizationMembers } from '@/components/organizations/OrganizationMembers';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchOrganizationMembers } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

interface OrganizationMembersPageProps {
  params: { orgId: string };
}

export default async function OrganizationMembersPage({
  params,
}: OrganizationMembersPageProps) {
  const organizationId = params.orgId;
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  const limit = 100;
  const offset = 0;

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.organizationMembers.list(organizationId, {
        limit,
        offset,
      }),
      queryFn: () =>
        fetchOrganizationMembers(graphqlClient, {
          organizationId,
          limit,
          offset,
        }),
    });
  } catch (error) {
    console.error('Organization members SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage who has access to this organization and their roles
          </p>
        </div>

        <OrganizationMembers organizationId={organizationId} />
      </div>
    </HydrationBoundary>
  );
}
