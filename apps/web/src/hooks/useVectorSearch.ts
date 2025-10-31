'use client';

import {
  useSearchDocumentsQuery,
  type SearchDocumentsInput,
} from '@/lib/api/hooks.generated';
import { useAuthStore } from '@/lib/stores/auth-store';

// Re-export types for convenience
export type {
  SearchDocumentsInput,
  SearchResult,
} from '@/lib/api/hooks.generated';

/**
 * React Query hook for semantic vector search across documents.
 *
 * Uses pgvector similarity search to find relevant document chunks
 * based on semantic meaning, not just keyword matching.
 *
 * Auth token is automatically injected via GraphQL client middleware.
 *
 * @example
 * // Basic search
 * const { results, isLoading } = useSearchDocuments({
 *   query: "What is artificial intelligence?",
 *   limit: 10,
 * });
 *
 * @example
 * // Search with filters
 * const { results, isLoading } = useSearchDocuments({
 *   query: "revenue projections",
 *   spaceId: "space-uuid",
 *   documentIds: ["doc-1", "doc-2"],
 *   limit: 5,
 *   similarityThreshold: 0.7, // Only return highly relevant results
 * });
 */
export function useSearchDocuments(input: SearchDocumentsInput) {
  const { accessToken } = useAuthStore();

  const query = useSearchDocumentsQuery(
    { input },
    {
      enabled: !!accessToken && !!input.query && input.query.trim().length > 0,
    }
  );

  return {
    results: query.data?.searchDocuments || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Expose raw query for advanced use cases
    query,
  };
}
