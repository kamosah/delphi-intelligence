'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateQueryMutation,
  useDeleteQueryResultMutation,
  useGetQueryResultQuery,
  useGetQueryResultsQuery,
  useUpdateQueryMutation,
} from '@/lib/api/hooks.generated';

// Re-export generated types for convenience
export type {
  CreateQueryInput,
  QueryResult,
  QueryStatusEnum,
  GetQueryResultsQuery,
  GetQueryResultQuery,
  UpdateQueryInput,
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

/**
 * React Query hook for creating a new query result.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { createQuery, isCreating } = useCreateQuery();
 *
 * const handleCreate = async () => {
 *   const result = await createQuery({
 *     input: {
 *       spaceId: 'space-123',
 *       queryText: 'What are the key findings?',
 *       result: 'The key findings are...',
 *       title: 'Key Findings Query',
 *       confidenceScore: 0.95,
 *     }
 *   });
 * };
 */
export function useCreateQuery() {
  const queryClient = useQueryClient();

  const mutation = useCreateQueryMutation({
    onSuccess: (data) => {
      if (data?.createQuery) {
        const query = data.createQuery;

        // Invalidate list queries to refetch with new item
        queryClient.invalidateQueries({
          queryKey: ['GetQueryResults', { spaceId: query.spaceId }],
        });

        // Set the new query in cache
        queryClient.setQueryData(['GetQueryResult', { id: query.id }], {
          query,
        });
      }
    },
  });

  return {
    createQuery: mutation.mutateAsync,
    createQuerySync: mutation.mutate,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for updating an existing query result.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { updateQuery, isUpdating } = useUpdateQuery();
 *
 * const handleUpdate = async (id: string) => {
 *   await updateQuery({
 *     id,
 *     input: {
 *       title: 'Updated Title',
 *       result: 'Updated result text',
 *     }
 *   });
 * };
 */
export function useUpdateQuery() {
  const queryClient = useQueryClient();

  const mutation = useUpdateQueryMutation({
    onSuccess: (data, variables) => {
      if (data?.updateQuery) {
        const query = data.updateQuery;

        // Invalidate list queries to refetch with updated item
        queryClient.invalidateQueries({
          queryKey: ['GetQueryResults', { spaceId: query.spaceId }],
        });

        // Update the query in cache
        queryClient.setQueryData(['GetQueryResult', { id: variables.id }], {
          query,
        });
      }
    },
  });

  return {
    updateQuery: mutation.mutateAsync,
    updateQuerySync: mutation.mutate,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
