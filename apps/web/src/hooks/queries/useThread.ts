import { useGetThreadQuery } from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/client';

// Re-export types for convenience (from generated, safe from cycles)
export type { GetThreadQuery } from '@/lib/api/generated';

/**
 * Hook to fetch a specific thread by ID.
 *
 * Wrapper around generated useGetThreadQuery hook with sensible defaults
 * and centralized query key for consistent cache management.
 *
 * @param threadId - The ID of the thread to fetch
 * @returns React Query result with thread data, loading, and error states
 *
 * @example
 * const { data, isLoading, error } = useThread(threadId);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 * if (!data?.thread) return <NotFound />;
 *
 * const thread = data.thread;
 * return <ThreadView thread={thread} />;
 */
export function useThread(threadId: string) {
  return useGetThreadQuery(
    { id: threadId },
    {
      queryKey: queryKeys.threads.detail(threadId),
      enabled: !!threadId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}
