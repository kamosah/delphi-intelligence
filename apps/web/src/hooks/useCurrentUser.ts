'use client';

import { useClientToken } from '@/hooks/useClientToken';
import { useGetMeQuery } from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';

// Re-export User type from generated types
export type { User } from '@/lib/api/generated';

/**
 * Hook to fetch the current authenticated user from GraphQL.
 *
 * Uses the `me` GraphQL query which returns the authenticated user's profile
 * including email confirmation status from Supabase.
 *
 * This hook:
 * - Fetches user data via GraphQL (not from Zustand)
 * - Includes Supabase email confirmation status
 * - Automatically refetches when client token changes
 * - Provides isLoading, error states for UI
 *
 * Usage:
 * ```tsx
 * const { user, isLoading, error } = useCurrentUser();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <UserProfile user={user} />;
 * ```
 */
export function useCurrentUser() {
  const { clientToken } = useClientToken();

  const query = useGetMeQuery(
    {},
    {
      enabled: !!clientToken,
      queryKey: queryKeys.auth.me(),
      // Cache user data for 5 minutes (mostly static)
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    }
  );

  return {
    user: query.data?.me || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
