'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClientToken } from '@/hooks/useClientToken';
import {
  useCreateOrganizationMutation,
  useDeleteOrganizationMutation,
  useGetOrganizationQuery,
  useGetOrganizationsQuery,
  useSwitchOrganizationMutation,
  useUpdateOrganizationMutation,
  type CreateOrganizationMutationVariables,
  type DeleteOrganizationMutationVariables,
  type GetOrganizationsQuery,
  type SwitchOrganizationMutationVariables,
  type UpdateOrganizationMutationVariables,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

// Re-export generated types
export type {
  CreateOrganizationInput,
  Organization,
  OrganizationRole,
  UpdateOrganizationInput,
} from '@/lib/api/generated';

/**
 * Fetch list of organizations where the authenticated user is a member.
 *
 * Includes computed `currentOrganization` using same logic as backend:
 * 1. Organization with is_default=true
 * 2. Most recently active (last_active_at DESC)
 * 3. First organization
 */
export function useOrganizations(options?: {
  limit?: number;
  offset?: number;
}) {
  const { clientToken } = useClientToken();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const query = useGetOrganizationsQuery(
    {
      limit,
      offset,
    },
    {
      enabled: !!clientToken,
      queryKey: queryKeys.organizations.list({
        limit,
        offset,
      }),
    }
  );

  const organizations = useMemo(
    () => query.data?.organizations || [],
    [query.data?.organizations]
  );

  // Current organization is the first one - backend guarantees correct order:
  // 1. is_default DESC NULLS LAST
  // 2. last_active_at DESC NULLS LAST
  // 3. created_at ASC
  const currentOrganization = useMemo(() => {
    return organizations.length > 0 ? organizations[0] : null;
  }, [organizations]);

  return {
    organizations,
    currentOrganization,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Fetch a single organization by ID
 */
export function useOrganization(id: string | undefined) {
  const { clientToken } = useClientToken();

  const query = useGetOrganizationQuery(
    { id: id || '' },
    {
      enabled: !!clientToken && !!id,
      queryKey: id ? queryKeys.organizations.detail(id) : undefined,
    }
  );

  return {
    organization: query.data?.organization || null,
    isLoading: query.isLoading,
    error: query.error,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Create a new organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  const mutation = useCreateOrganizationMutation({
    onSuccess: () => {
      // Invalidate organizations list to refetch with new organization
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.lists(),
      });
    },
  });

  return {
    createOrganization: (variables: CreateOrganizationMutationVariables) =>
      mutation.mutateAsync(variables),
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Update an existing organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  const mutation = useUpdateOrganizationMutation({
    onSuccess: (data, variables) => {
      // Invalidate specific organization query
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(variables.id),
      });
      // Invalidate organizations list
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.lists(),
      });
    },
  });

  return {
    updateOrganization: (variables: UpdateOrganizationMutationVariables) =>
      mutation.mutateAsync(variables),
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Delete an organization
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  const mutation = useDeleteOrganizationMutation({
    onSuccess: () => {
      // Invalidate organizations list to remove deleted organization
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.lists(),
      });
    },
  });

  return {
    deleteOrganization: (variables: DeleteOrganizationMutationVariables) =>
      mutation.mutateAsync(variables),
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Switch user's current organization
 *
 * Updates organization_members.is_default and last_active_at on backend.
 * Optimistically updates Zustand store and refetches org-scoped queries.
 */
export function useSwitchOrganization() {
  const queryClient = useQueryClient();
  const { setCurrentOrganization, currentOrganization } = useAuthStore();

  const mutation = useSwitchOrganizationMutation({
    onMutate: async (variables) => {
      // Optimistically update Zustand store for instant UI feedback
      const previousOrg = currentOrganization;

      // Find the organization from the organizations query cache
      const organizationsData = queryClient.getQueryData<GetOrganizationsQuery>(
        queryKeys.organizations.lists()
      );

      const newOrg = organizationsData?.organizations?.find(
        (org) => org.id === variables.input.organizationId
      );

      if (newOrg) {
        setCurrentOrganization(newOrg);
      }

      return { previousOrg };
    },
    onSuccess: async () => {
      // CRITICAL: Refetch organizations list to get updated is_default and last_active_at
      // This ensures useOrganizations recomputes currentOrganization with fresh data
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      });

      // Invalidate all org-scoped queries to refetch with new org context
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });

      toast.success('Organization switched successfully');
    },
    onError: (error, variables, context) => {
      // Rollback Zustand update on error
      if (context?.previousOrg) {
        setCurrentOrganization(context.previousOrg);
      }

      toast.error('Failed to switch organization', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  return {
    switchOrganization: (variables: SwitchOrganizationMutationVariables) =>
      mutation.mutateAsync(variables),
    isSwitching: mutation.isPending,
    error: mutation.error,
  };
}
