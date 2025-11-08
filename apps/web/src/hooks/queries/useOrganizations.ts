'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { queryKeys } from '@/lib/query/client';
import {
  useGetOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  type GetOrganizationsQueryVariables,
  type CreateOrganizationMutationVariables,
  type UpdateOrganizationMutationVariables,
  type DeleteOrganizationMutationVariables,
} from '@/lib/api/hooks.generated';
import { useQueryClient } from '@tanstack/react-query';

// Re-export generated types
export type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationRole,
} from '@/lib/api/generated';

/**
 * Fetch list of organizations where the authenticated user is a member
 */
export function useOrganizations(options?: {
  limit?: number;
  offset?: number;
}) {
  const { accessToken } = useAuthStore();

  const query = useGetOrganizationsQuery(
    {
      limit: options?.limit,
      offset: options?.offset,
    },
    {
      enabled: !!accessToken,
      queryKey: queryKeys.organizations.list({
        limit: options?.limit,
        offset: options?.offset,
      }),
    }
  );

  return {
    organizations: query.data?.organizations || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Fetch a single organization by ID
 */
export function useOrganization(id: string | undefined) {
  const { accessToken } = useAuthStore();

  const query = useGetOrganizationQuery(
    { id: id || '' },
    {
      enabled: !!accessToken && !!id,
      queryKey: id ? queryKeys.organizations.detail(id) : undefined,
    }
  );

  return {
    organization: query.data?.organization || null,
    isLoading: query.isLoading,
    error: query.error,
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
