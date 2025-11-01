'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDeleteQueryResultMutation,
  useGetQueryResultQuery,
  useGetQueryResultsQuery,
} from '@/lib/api/hooks.generated';

// Re-export generated types for convenience
export type {
  QueryResult,
  QueryStatusEnum,
  GetQueryResultsQuery,
  GetQueryResultQuery,
} from '@/lib/api/generated';

/**
 * React Query hook for listing query results in a space.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { queryResults, isLoading, error } = useQueryResults(spaceId);
 */
export function useQueryResults(
  spaceId: string,
  options?: { limit?: number; offset?: number }
) {
  const { accessToken } = useAuthStore();

  const query = useGetQueryResultsQuery(
    {
      spaceId,
      limit: options?.limit,
      offset: options?.offset,
    },
    {
      enabled: !!accessToken && !!spaceId,
    }
  );

  return {
    queryResults: query.data?.queries || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for getting a single query result by ID.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { queryResult, isLoading } = useQueryResult(queryId);
 */
export function useQueryResult(id: string) {
  const { accessToken } = useAuthStore();

  const query = useGetQueryResultQuery(
    { id },
    {
      enabled: !!accessToken && !!id,
    }
  );

  return {
    queryResult: query.data?.query,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for deleting a query result.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { deleteQueryResult, isDeleting } = useDeleteQueryResult();
 *
 * const handleDelete = async (id: string, spaceId: string) => {
 *   await deleteQueryResult({ id, spaceId });
 * };
 */
export function useDeleteQueryResult() {
  const queryClient = useQueryClient();

  const mutation = useDeleteQueryResultMutation({
    onSuccess: (data, variables) => {
      // Note: We need spaceId to invalidate properly, but mutation only takes id
      // The component calling this should handle invalidation via onSuccess callback
      // OR we can invalidate all query result queries
      queryClient.invalidateQueries({ queryKey: ['GetQueryResults'] });

      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['GetQueryResult', { id: variables.id }],
      });
    },
  });

  return {
    deleteQueryResult: mutation.mutateAsync,
    deleteQueryResultSync: mutation.mutate,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
