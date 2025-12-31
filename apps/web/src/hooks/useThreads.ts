'use client';

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClientToken } from '@/hooks/useClientToken';
import type { Thread } from '@/lib/api/generated';
import {
  useCreateThreadMutation,
  useDeleteThreadMutation,
  useGetThreadQuery,
  useGetThreadsQuery,
  useUpdateThreadMutation,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

// Re-export generated types for convenience
export type {
  CreateThreadInput,
  GetThreadQuery,
  GetThreadsQuery,
  Thread,
  ThreadStatusEnum,
  UpdateThreadInput,
} from '@/lib/api/generated';

/**
 * React Query hook for listing threads in a space or organization.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * // Get threads for a specific space
 * const { threads, isLoading, error } = useThreads({ spaceId });
 *
 * // Get org-wide threads (uses current org by default)
 * const { threads, isLoading, error } = useThreads();
 *
 * // Get threads for a specific organization
 * const { threads, isLoading, error } = useThreads({ organizationId });
 */
export function useThreads(options?: {
  spaceId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}) {
  const { clientToken } = useClientToken();
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  const spaceId = options?.spaceId;
  const orgId = options?.organizationId ?? currentOrganization?.id;
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const query = useGetThreadsQuery(
    {
      spaceId: spaceId,
      organizationId: orgId,
      limit,
      offset,
    },
    {
      enabled: !!clientToken,
      queryKey: queryKeys.threads.list({
        spaceId: spaceId,
        organizationId: orgId,
        limit,
        offset,
      }),
    }
  );

  // Pre-populate individual thread caches for instant navigation
  // When user clicks on a thread from the list, detail page loads from cache (no network request)
  // IMPORTANT: Only populate if cache is empty to avoid overwriting fresher detail data with stale list data
  const populateCaches = useCallback(() => {
    if (query.isSuccess && query.data?.threads) {
      query.data.threads.forEach((thread) => {
        // Check if this thread is already cached - if so, don't overwrite with potentially stale list data
        const existingData = queryClient.getQueryData(
          queryKeys.threads.detail(thread.id)
        );
        if (!existingData) {
          queryClient.setQueryData(queryKeys.threads.detail(thread.id), {
            thread,
          });
        }
      });
    }
  }, [query.isSuccess, query.data, queryClient]);

  useEffect(() => {
    populateCaches();
  }, [populateCaches]);

  return {
    threads: query.data?.threads || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for getting a single thread by ID.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { thread, isLoading, isSuccess } = useThread(threadId);
 *
 * @returns Object containing:
 * - `thread`: The thread data (undefined while loading or on error)
 * - `isLoading`: True while the query is in progress
 * - `error`: Error object if the query failed
 * - `refetch`: Function to manually refetch the thread
 * - `isSuccess`: True when the query has successfully completed
 */
export function useThread(id: string) {
  const { clientToken } = useClientToken();

  const query = useGetThreadQuery(
    { id },
    {
      enabled: !!clientToken && !!id,
      queryKey: queryKeys.threads.detail(id),
    }
  );

  return {
    thread: query.data?.thread,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isSuccess: query.isSuccess,
  };
}

/**
 * React Query hook for deleting a thread.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 * Uses optimistic updates to immediately update the UI before server response.
 *
 * @example
 * const { deleteThread, isDeleting } = useDeleteThread();
 *
 * const handleDelete = async (id: string) => {
 *   await deleteThread({ id });
 * };
 */
export function useDeleteThread() {
  const queryClient = useQueryClient();

  const mutation = useDeleteThreadMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.threads.lists() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });

      // Snapshot previous value for rollback
      const previousThreadLists = queryClient.getQueriesData({
        queryKey: queryKeys.threads.lists(),
      });

      // Optimistically remove thread from all list queries
      queryClient.setQueriesData<{ threads: Thread[] }>(
        { queryKey: queryKeys.threads.lists() },
        (old) => {
          if (!old?.threads) return old;
          return {
            ...old,
            threads: old.threads.filter((thread) => thread.id !== variables.id),
          };
        }
      );

      // Return context for rollback
      return { previousThreadLists };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousThreadLists) {
        context.previousThreadLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // Notify user of error
      toast.error('Failed to delete thread. Please try again.');
    },
    onSettled: (data, _error, variables) => {
      // Always refetch to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.lists() });
      queryClient.removeQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });
    },
  });

  return {
    deleteThread: mutation.mutateAsync,
    deleteThreadSync: mutation.mutate,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for creating a new thread.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * const { createThread, isCreating } = useCreateThread();
 *
 * const handleCreate = async () => {
 *   const result = await createThread({
 *     input: {
 *       organizationId: 'org-123',
 *       spaceId: 'space-123', // optional
 *       queryText: 'What are the key findings?',
 *       result: 'The key findings are...',
 *       title: 'Key Findings Thread',
 *       confidenceScore: 0.95,
 *     }
 *   });
 * };
 */
export function useCreateThread() {
  const queryClient = useQueryClient();

  const mutation = useCreateThreadMutation({
    onSuccess: (data) => {
      if (data?.createThread) {
        const thread = data.createThread;

        // Set the new thread in cache
        queryClient.setQueryData(queryKeys.threads.detail(thread.id), {
          thread,
        });
      }
    },
  });

  return {
    createThread: mutation.mutateAsync,
    createThreadSync: mutation.mutate,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * React Query hook for updating an existing thread.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 * Uses optimistic updates to immediately update the UI before server response.
 *
 * @example
 * const { updateThread, isUpdating } = useUpdateThread();
 *
 * const handleUpdate = async (id: string) => {
 *   await updateThread({
 *     id,
 *     input: {
 *       title: 'Updated Title',
 *       result: 'Updated result text',
 *     }
 *   });
 * };
 */
export function useUpdateThread() {
  const queryClient = useQueryClient();

  const mutation = useUpdateThreadMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.threads.lists() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.threads.detail(variables.id),
      });

      // Snapshot previous values for rollback
      const previousThreadLists = queryClient.getQueriesData({
        queryKey: queryKeys.threads.lists(),
      });
      const previousThread = queryClient.getQueryData(
        queryKeys.threads.detail(variables.id)
      );

      // Optimistically update thread in all list queries
      queryClient.setQueriesData<{ threads: Thread[] }>(
        { queryKey: queryKeys.threads.lists() },
        (old) => {
          if (!old?.threads) return old;
          return {
            ...old,
            threads: old.threads.map((thread) =>
              thread.id === variables.id
                ? ({ ...thread, ...variables.input } as Thread)
                : thread
            ),
          };
        }
      );

      // Optimistically update thread detail query
      queryClient.setQueryData<{ thread: Thread }>(
        queryKeys.threads.detail(variables.id),
        (old) => {
          if (!old?.thread) return old;
          return {
            ...old,
            thread: { ...old.thread, ...variables.input } as Thread,
          };
        }
      );

      // Return context for rollback
      return { previousThreadLists, previousThread };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousThreadLists) {
        context.previousThreadLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousThread) {
        queryClient.setQueryData(
          queryKeys.threads.detail(variables.id),
          context.previousThread
        );
      }
      // Notify user of error
      toast.error('Failed to update thread. Please try again.');
    },
    onSettled: (data, _error, variables) => {
      // Always refetch to ensure cache is in sync with server
      queryClient.invalidateQueries({
        queryKey: queryKeys.threads.lists(),
      });

      if (data?.updateThread) {
        // Update cache with server data
        queryClient.setQueryData(queryKeys.threads.detail(variables.id), {
          thread: data.updateThread,
        });
      }
    },
  });

  return {
    updateThread: mutation.mutateAsync,
    updateThreadSync: mutation.mutate,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
