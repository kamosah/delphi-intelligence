'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { queryKeys } from '@/lib/query/client';
import {
  useGetOrganizationMembersQuery,
  useAddOrganizationMemberMutation,
  useRemoveOrganizationMemberMutation,
  useUpdateMemberRoleMutation,
  type GetOrganizationMembersQueryVariables,
  type AddOrganizationMemberMutationVariables,
  type RemoveOrganizationMemberMutationVariables,
  type UpdateMemberRoleMutationVariables,
} from '@/lib/api/hooks.generated';
import { useQueryClient } from '@tanstack/react-query';

// Re-export generated types
export type {
  OrganizationMember,
  AddOrganizationMemberInput,
  OrganizationRole,
} from '@/lib/api/generated';

/**
 * Fetch list of members for a specific organization
 */
export function useOrganizationMembers(
  organizationId: string | undefined,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const { accessToken } = useAuthStore();

  const query = useGetOrganizationMembersQuery(
    {
      organizationId: organizationId || '',
      limit: options?.limit,
      offset: options?.offset,
    },
    {
      enabled: !!accessToken && !!organizationId,
      queryKey: organizationId
        ? queryKeys.organizationMembers.list(organizationId, {
            limit: options?.limit,
            offset: options?.offset,
          })
        : undefined,
    }
  );

  return {
    members: query.data?.organizationMembers || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Add a member to an organization
 */
export function useAddOrganizationMember() {
  const queryClient = useQueryClient();

  const mutation = useAddOrganizationMemberMutation({
    onSuccess: (data, variables) => {
      // Invalidate members list for this organization
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers.lists(),
      });
      // Invalidate organization details to update member count
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(
          variables.input.organizationId
        ),
      });
    },
  });

  return {
    addMember: (variables: AddOrganizationMemberMutationVariables) =>
      mutation.mutateAsync(variables),
    isAdding: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Remove a member from an organization
 */
export function useRemoveOrganizationMember() {
  const queryClient = useQueryClient();

  const mutation = useRemoveOrganizationMemberMutation({
    onSuccess: (data, variables) => {
      // Invalidate members list for this organization
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers.lists(),
      });
      // Invalidate organization details to update member count
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(variables.organizationId),
      });
    },
  });

  return {
    removeMember: (variables: RemoveOrganizationMemberMutationVariables) =>
      mutation.mutateAsync(variables),
    isRemoving: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Update a member's role in an organization
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  const mutation = useUpdateMemberRoleMutation({
    onSuccess: (data, variables) => {
      // Invalidate members list for this organization
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers.lists(),
      });
    },
  });

  return {
    updateRole: (variables: UpdateMemberRoleMutationVariables) =>
      mutation.mutateAsync(variables),
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
