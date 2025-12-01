'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Organization, GetOrganizationsQuery } from '@/lib/api/generated';
import { graphqlClient } from '@/lib/api/graphql-client';
import {
  useUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  GetOrganizationsDocument,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

// Re-export generated types for convenience
export type {
  UserPreferences,
  UpdateUserPreferencesInput,
} from '@/lib/api/generated';

/**
 * React Query hook for getting user preferences.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { userPreferences, isLoading } = useUserPreferences();
 */
export function useUserPreferences() {
  const { accessToken, user } = useAuthStore();
  const userId = user?.id || '';

  const query = useUserPreferencesQuery(
    {},
    {
      enabled: !!accessToken && !!userId,
      queryKey: queryKeys.userPreferences.detail(userId),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return {
    userPreferences: query.data?.userPreferences,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for updating user preferences.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { updateUserPreferences, isUpdating } = useUpdateUserPreferences();
 *
 * const handleUpdate = async () => {
 *   await updateUserPreferences({
 *     input: {
 *       theme: 'dark',
 *       browserNotificationsEnabled: true
 *     }
 *   });
 * };
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  const mutation = useUpdateUserPreferencesMutation({
    onSuccess: () => {
      // Invalidate user preferences to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences.details(),
      });
    },
  });

  return {
    updateUserPreferences: mutation.mutateAsync,
    updateUserPreferencesSync: mutation.mutate,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for updating browser notification preference specifically.
 *
 * Convenience wrapper around useUpdateUserPreferences.
 *
 * @example
 * const { updateBrowserNotifications, isUpdating } = useUpdateBrowserNotificationPreference();
 *
 * const handleEnable = async () => {
 *   await updateBrowserNotifications(true);
 * };
 */
export function useUpdateBrowserNotificationPreference() {
  const queryClient = useQueryClient();

  const mutation = useUpdateUserPreferencesMutation({
    onSuccess: () => {
      // Invalidate user preferences to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences.details(),
      });
    },
  });

  return {
    updateBrowserNotifications: (enabled: boolean) =>
      mutation.mutateAsync({
        input: {
          browserNotificationsEnabled: enabled,
        },
      }),
    updateBrowserNotificationsSync: (enabled: boolean) => {
      mutation.mutate({
        input: {
          browserNotificationsEnabled: enabled,
        },
      });
    },
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for updating the current organization in user preferences.
 *
 * This syncs the client-side Zustand state with the backend.
 * Always use this when switching organizations (not just Zustand).
 *
 * @example
 * const { updateCurrentOrganization, isUpdating } = useUpdateCurrentOrganization();
 *
 * const handleSwitch = async (orgId: string) => {
 *   await updateCurrentOrganization(orgId);
 * };
 */
export function useUpdateCurrentOrganization() {
  const queryClient = useQueryClient();
  const { setCurrentOrganization } = useAuthStore();

  const mutation = useUpdateUserPreferencesMutation({
    onMutate: async (variables) => {
      // Capture previous state for rollback on error
      const previousOrganization = useAuthStore.getState().currentOrganization;

      // Optimistically update Zustand for instant UI feedback
      const orgId = variables.input.currentOrganizationId;

      if (orgId) {
        // Get org from React Query cache using the correct query key
        const orgsQuery = queryClient.getQueryData<{
          organizations: Organization[];
        }>(queryKeys.organizations.list({ limit: 100, offset: 0 }));
        const org = orgsQuery?.organizations?.find((o) => o.id === orgId);

        if (org) {
          setCurrentOrganization({
            id: org.id,
            name: org.name,
            slug: org.slug,
            description: org.description,
            ownerId: org.ownerId,
            memberCount: org.memberCount,
            spaceCount: org.spaceCount,
            threadCount: org.threadCount,
          });
        } else {
          console.warn(
            '[useUpdateCurrentOrganization] Org not found in cache, will update after backend response'
          );
        }
      } else {
        setCurrentOrganization(null);
      }

      // Return context for rollback
      return { previousOrganization };
    },
    onSuccess: () => {
      // Invalidate queries that depend on organization
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences.details(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.spaces.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.lists(),
      });
    },
    onError: (error, variables, context) => {
      console.error(
        '[useUpdateCurrentOrganization] onError - mutation failed:',
        error
      );

      // Rollback to previous state
      if (context?.previousOrganization !== undefined) {
        setCurrentOrganization(context.previousOrganization);
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences.details(),
      });
      toast.error('Failed to switch organization. Please try again.');
    },
  });

  return {
    updateCurrentOrganization: (organizationId: string | null) =>
      mutation.mutateAsync({
        input: { currentOrganizationId: organizationId },
      }),
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for auto-selecting an organization on app load or login.
 *
 * Uses user preferences from backend as source of truth and syncs with Zustand.
 * Implements smart fallback: preferred org → first org → null.
 *
 * @example
 * ```typescript
 * const autoSelectOrganization = useAutoSelectOrganization();
 *
 * useEffect(() => {
 *   if (accessToken && !currentOrganization) {
 *     autoSelectOrganization();
 *   }
 * }, [accessToken, currentOrganization, autoSelectOrganization]);
 * ```
 */
export function useAutoSelectOrganization() {
  const queryClient = useQueryClient();
  const { setCurrentOrganization } = useAuthStore();
  const { userPreferences } = useUserPreferences();
  const { updateCurrentOrganization } = useUpdateCurrentOrganization();

  return useCallback(async () => {
    try {
      // Fetch organizations using React Query cache
      const orgsData = await queryClient.fetchQuery<Organization[]>({
        queryKey: queryKeys.organizations.lists(),
        queryFn: async () => {
          const response = await graphqlClient.request<GetOrganizationsQuery>(
            GetOrganizationsDocument,
            { limit: 100 }
          );
          return (response.organizations || []) as Organization[];
        },
      });

      if (orgsData.length === 0) {
        setCurrentOrganization(null);
        return;
      }

      const preferredOrgId = userPreferences?.currentOrganizationId;
      const firstOrganization = orgsData[0];

      // Find preferred org or fall back to first
      const selectedOrg = preferredOrgId
        ? orgsData.find((org) => org.id === preferredOrgId) || firstOrganization
        : firstOrganization;

      // Update backend if no preference set or preferred org no longer exists
      const needsBackendSync =
        !preferredOrgId || !orgsData.find((org) => org.id === preferredOrgId);

      if (needsBackendSync) {
        // This also updates Zustand optimistically
        await updateCurrentOrganization(selectedOrg.id);
      } else {
        // Backend already correct, just update Zustand
        setCurrentOrganization(selectedOrg);
      }
    } catch (error) {
      console.error('Failed to auto-select organization:', error);
      // Don't throw - allow user to continue and manually select organization
    }
  }, [
    queryClient,
    setCurrentOrganization,
    userPreferences,
    updateCurrentOrganization,
  ]);
}
