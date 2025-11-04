import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh (5 minutes)
      staleTime: 1000 * 60 * 5,

      // Cache time: How long data stays in cache after component unmounts (10 minutes)
      gcTime: 1000 * 60 * 10,

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,

      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent query key management
export const queryKeys = {
  // Auth queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Spaces queries
  spaces: {
    all: ['spaces'] as const,
    lists: () => [...queryKeys.spaces.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.spaces.lists(), filters] as const,
    details: () => [...queryKeys.spaces.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.spaces.details(), id] as const,
  },

  // Documents queries
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (spaceId?: string | null, filters?: Record<string, any>) =>
      [...queryKeys.documents.lists(), spaceId, filters] as const,
    details: () => [...queryKeys.documents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.documents.details(), id] as const,
  },

  // Queries (AI-powered queries on documents)
  queries: {
    all: ['queries'] as const,
    lists: () => [...queryKeys.queries.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.queries.lists(), filters] as const,
    details: () => [...queryKeys.queries.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.queries.details(), id] as const,
  },

  // Threads (individual query conversations)
  threads: {
    all: ['threads'] as const,
    lists: () => [...queryKeys.threads.all, 'list'] as const,
    list: (spaceId: string) => [...queryKeys.threads.lists(), spaceId] as const,
    details: () => [...queryKeys.threads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.threads.details(), id] as const,
  },
} as const;
