import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { PreferencesForm } from '@/components/settings/PreferencesForm';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchUserPreferences } from '@/lib/api/server-fetchers/user-preferences';
import { queryKeys } from '@/lib/query/query-keys';

/**
 * User Preferences Settings Page
 *
 * Server Component with SSR prefetching for user preferences.
 */
export default async function PreferencesPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.userPreferences.details(),
      queryFn: () => fetchUserPreferences(graphqlClient),
    });
  } catch (error) {
    console.error('User preferences SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Preferences</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your notification settings and preferences
          </p>
        </div>
        <PreferencesForm />
      </div>
    </HydrationBoundary>
  );
}
