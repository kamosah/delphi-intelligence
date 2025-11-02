// SSE streaming utilities for query execution
// Note: All query CRUD operations (create, read, update, delete) use GraphQL

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// SSE Event Type Definitions
// ============================================================================

export interface Citation {
  index: number;
  text: string;
  document_id: string;
  document_title?: string;
  chunk_index: number;
  similarity_score: number; // Backend sends similarity_score (0-1)
  page_number?: number;
  confidence_level?: 'high' | 'medium' | 'low';
}

export type SSETokenEvent = {
  type: 'token';
  content: string;
};

export type SSEReplaceEvent = {
  type: 'replace';
  content: string;
};

export type SSECitationsEvent = {
  type: 'citations';
  sources: Citation[];
  confidence_score: number;
};

export type SSEDoneEvent = {
  type: 'done';
  confidence_score: number;
  query_id?: string;
};

export type SSEErrorEvent = {
  type: 'error';
  message: string;
};

export type SSEEvent =
  | SSETokenEvent
  | SSEReplaceEvent
  | SSECitationsEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// ============================================================================
// SSE Streaming API
// ============================================================================

/**
 * Build SSE stream URL for query execution.
 *
 * This is the ONLY REST endpoint for queries - all CRUD operations use GraphQL.
 *
 * @example
 * const url = buildStreamUrl({
 *   query: 'What are the key findings?',
 *   spaceId: 'space-123',
 *   userId: 'user-123',
 *   saveToDb: true,
 * });
 *
 * const eventSource = new EventSource(`${url}&token=${accessToken}`);
 */
export function buildStreamUrl(params: {
  query: string;
  spaceId?: string;
  userId?: string;
  saveToDb?: boolean;
}): string {
  const searchParams = new URLSearchParams({
    query: params.query,
    ...(params.spaceId && { space_id: params.spaceId }),
    ...(params.userId && { user_id: params.userId }),
    ...(params.saveToDb !== undefined && {
      save_to_db: String(params.saveToDb),
    }),
  });

  return `${API_BASE_URL}/api/query/stream?${searchParams.toString()}`;
}
