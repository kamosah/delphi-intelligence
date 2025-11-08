/**
 * Query keys factory for consistent query key management across the application.
 *
 * Usage:
 * - Import queryKeys from this file
 * - Use in React Query hooks: useQuery({ queryKey: queryKeys.spaces.all })
 * - Use for invalidation: queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
 */
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

  // Threads (AI-powered queries/conversations on documents)
  threads: {
    all: ['threads'] as const,
    lists: () => [...queryKeys.threads.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.threads.lists(), filters] as const,
    details: () => [...queryKeys.threads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.threads.details(), id] as const,
  },
} as const;
