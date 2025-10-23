'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateSpaceMutation,
  useDeleteSpaceMutation,
  useGetSpaceQuery,
  useGetSpacesQuery,
  useUpdateSpaceMutation,
} from '@/lib/api/hooks.generated';

// Re-export generated types for convenience
export type {
  Space,
  CreateSpaceInput,
  UpdateSpaceInput,
  GetSpacesQuery,
  GetSpaceQuery,
} from '@/lib/api/generated';

/**
 * React Query hook for listing all spaces.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { spaces, isLoading, error } = useSpaces();
 */
export function useSpaces(options?: { limit?: number; offset?: number }) {
  const { accessToken } = useAuthStore();

  const query = useGetSpacesQuery(
    {
      limit: options?.limit,
      offset: options?.offset,
    },
    {
      enabled: !!accessToken,
    }
  );

  return {
    spaces: query.data?.spaces || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for getting a single space by ID.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { space, isLoading } = useSpace(spaceId);
 */
export function useSpace(id: string) {
  const { accessToken } = useAuthStore();

  const query = useGetSpaceQuery(
    { id },
    {
      enabled: !!accessToken && !!id,
    }
  );

  return {
    space: query.data?.space,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for creating a new space.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { createSpace, isCreating } = useCreateSpace();
 *
 * const handleCreate = async () => {
 *   await createSpace({
 *     name: 'New Space',
 *     description: 'Description',
 *     iconColor: '#3B82F6'
 *   });
 * };
 */
export function useCreateSpace() {
  const queryClient = useQueryClient();

  const mutation = useCreateSpaceMutation({
    onSuccess: () => {
      // Invalidate spaces list to refetch
      queryClient.invalidateQueries({ queryKey: ['GetSpaces'] });
    },
  });

  return {
    createSpace: mutation.mutateAsync,
    createSpaceSync: mutation.mutate,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for updating a space.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { updateSpace, isUpdating } = useUpdateSpace();
 *
 * const handleUpdate = async (id: string) => {
 *   await updateSpace({
 *     id,
 *     input: { name: 'Updated Name' }
 *   });
 * };
 */
export function useUpdateSpace() {
  const queryClient = useQueryClient();

  const mutation = useUpdateSpaceMutation({
    onSuccess: (data, variables) => {
      // Invalidate spaces list to refetch
      queryClient.invalidateQueries({ queryKey: ['GetSpaces'] });
      // Invalidate specific space
      queryClient.invalidateQueries({
        queryKey: ['GetSpace', { id: variables.id }],
      });
    },
  });

  return {
    updateSpace: mutation.mutateAsync,
    updateSpaceSync: mutation.mutate,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for deleting a space.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { deleteSpace, isDeleting } = useDeleteSpace();
 *
 * const handleDelete = async (id: string) => {
 *   await deleteSpace({ id });
 * };
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient();

  const mutation = useDeleteSpaceMutation({
    onSuccess: (data, variables) => {
      // Invalidate spaces list to refetch
      queryClient.invalidateQueries({ queryKey: ['GetSpaces'] });
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['GetSpace', { id: variables.id }],
      });
    },
  });

  return {
    deleteSpace: mutation.mutateAsync,
    deleteSpaceSync: mutation.mutate,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
