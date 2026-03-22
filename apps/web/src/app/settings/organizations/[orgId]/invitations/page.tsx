import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { OrganizationInvitations } from '@/components/organizations/OrganizationInvitations';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchOrganizationInvitations } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

interface OrganizationInvitationsPageProps {
  params: { orgId: string };
}

export default async function OrganizationInvitationsPage({
  params,
}: OrganizationInvitationsPageProps) {
  const organizationId = params.orgId;
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.organizations.invitations(organizationId),
      queryFn: () =>
        fetchOrganizationInvitations(graphqlClient, {
          organizationId,
        }),
    });
  } catch (error) {
    console.error('Organization invitations SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invitations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite team members to join your organization via email
          </p>
        </div>

        <OrganizationInvitations organizationId={organizationId} />
      </div>
    </HydrationBoundary>
  );
}
