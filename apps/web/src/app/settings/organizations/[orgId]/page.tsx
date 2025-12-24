import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { OrganizationSettingsForm } from '@/components/settings/OrganizationSettingsForm';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchOrganization } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

interface OrganizationSettingsPageProps {
  params: { orgId: string };
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const organizationId = params.orgId;
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.organizations.detail(organizationId),
      queryFn: () => fetchOrganization(graphqlClient, { id: organizationId }),
    });
  } catch (error) {
    console.error('Organization settings SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Organization Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization's information and preferences
          </p>
        </div>
        <OrganizationSettingsForm organizationId={organizationId} />
      </div>
    </HydrationBoundary>
  );
}
