'use client';

import {
  queriesApi,
  type Query,
  type QueryListResponse,
} from '@/lib/api/queries-client';
import { queryKeys } from '@/lib/query/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * React Query hook for fetching query history in a space.
 *
 * @example
 * const { queries, isLoading, error } = useQueryHistory(spaceId);
 */
export function useQueryHistory(spaceId: string) {
  const { accessToken } = useAuthStore();

  const query = useQuery({
    queryKey: queryKeys.queries.list({ spaceId }),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      return queriesApi.list(accessToken, spaceId);
    },
    enabled: !!accessToken && !!spaceId,
  });

  return {
    queries: query.data?.queries || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for getting a single query by ID.
 *
 * @example
 * const { query, isLoading } = useQueryDetail(queryId);
 */
export function useQueryDetail(queryId: string) {
  const { accessToken } = useAuthStore();

  const queryResult = useQuery({
    queryKey: queryKeys.queries.detail(queryId),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      return queriesApi.get(queryId, accessToken);
    },
    enabled: !!accessToken && !!queryId,
  });

  return {
    query: queryResult.data,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

/**
 * React Query hook for deleting a query.
 *
 * @example
 * const { deleteQuery } = useDeleteQuery();
 *
 * const handleDelete = async (queryId: string, spaceId: string) => {
 *   await deleteQuery({ queryId, spaceId });
 * };
 */
export function useDeleteQuery() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async ({
      queryId,
      spaceId,
    }: {
      queryId: string;
      spaceId: string;
    }) => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      return queriesApi.delete(queryId, accessToken);
    },
    onSuccess: (data, variables) => {
      // Invalidate query list for the space
      queryClient.invalidateQueries({
        queryKey: queryKeys.queries.list({ spaceId: variables.spaceId }),
      });

      // Remove from cache
      queryClient.removeQueries({
        queryKey: queryKeys.queries.detail(variables.queryId),
      });
    },
  });

  return {
    deleteQuery: mutation.mutateAsync,
    deleteQuerySync: mutation.mutate,
    isDeleting: mutation.isPending,
    deleteError: mutation.error,
  };
}
