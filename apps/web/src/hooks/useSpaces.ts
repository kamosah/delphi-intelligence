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
import { setAuthToken } from '@/lib/api/graphql-client';
import { useEffect } from 'react';

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
 * @example
 * const { spaces, isLoading, error } = useSpaces();
 */
export function useSpaces(options?: { limit?: number; offset?: number }) {
  const { accessToken } = useAuthStore();

  // Set auth token in GraphQL client
  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken]);

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
 * @example
 * const { space, isLoading } = useSpace(spaceId);
 */
export function useSpace(id: string) {
  const { accessToken } = useAuthStore();

  // Set auth token in GraphQL client
  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken]);

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
  const { accessToken } = useAuthStore();

  // Set auth token in GraphQL client
  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken]);

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
  const { accessToken } = useAuthStore();

  // Set auth token in GraphQL client
  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken]);

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
 * @example
 * const { deleteSpace, isDeleting } = useDeleteSpace();
 *
 * const handleDelete = async (id: string) => {
 *   await deleteSpace({ id });
 * };
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  // Set auth token in GraphQL client
  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken]);

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
