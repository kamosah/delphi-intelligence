'use client';

import {
  useCreateThreadMutation,
  useDeleteThreadMutation,
  useGetThreadQuery,
  useGetThreadsQuery,
  useUpdateThreadMutation,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';

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
 * // Get org-wide threads
 * const { threads, isLoading, error } = useThreads({ organizationId });
 */
export function useThreads(options?: {
  spaceId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}) {
  const { accessToken } = useAuthStore();

  const query = useGetThreadsQuery(
    {
      spaceId: options?.spaceId,
      organizationId: options?.organizationId,
      limit: options?.limit,
      offset: options?.offset,
    },
    {
      enabled: !!accessToken,
      queryKey: queryKeys.threads.list({
        spaceId: options?.spaceId,
        organizationId: options?.organizationId,
        limit: options?.limit,
        offset: options?.offset,
      }),
    }
  );

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
  const { accessToken } = useAuthStore();

  const query = useGetThreadQuery(
    { id },
    {
      enabled: !!accessToken && !!id,
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
    onSuccess: (data, variables) => {
      // Invalidate all thread list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.lists() });

      // Remove specific thread from cache
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
    onSuccess: (data, variables) => {
      if (data?.updateThread) {
        const thread = data.updateThread;

        // Invalidate list queries to refetch with updated item
        queryClient.invalidateQueries({
          queryKey: queryKeys.threads.lists(),
        });

        // Update the thread in cache
        queryClient.setQueryData(queryKeys.threads.detail(variables.id), {
          thread,
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
