// REST API client for query endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Type Definitions
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

export interface Query {
  id: string;
  space_id: string;
  query_text: string;
  result: string | null;
  confidence_score: number | null;
  sources: {
    citations: Citation[];
    count: number;
  } | null;
  agent_steps: Record<string, any> | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QueryListResponse {
  queries: Query[];
  total: number;
}

// SSE Event Types
export type SSETokenEvent = {
  type: 'token';
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
  | SSECitationsEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// ============================================================================
// Helper Functions
// ============================================================================

// Helper function for making authenticated API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

// ============================================================================
// Query API Functions
// ============================================================================

export const queriesApi = {
  /**
   * List queries in a space
   */
  list: async (
    accessToken: string,
    spaceId: string
  ): Promise<QueryListResponse> => {
    return apiRequest<QueryListResponse>(
      `/api/queries?space_id=${spaceId}`,
      { method: 'GET' },
      accessToken
    );
  },

  /**
   * Get query by ID
   */
  get: async (queryId: string, accessToken: string): Promise<Query> => {
    return apiRequest<Query>(
      `/api/queries/${queryId}`,
      { method: 'GET' },
      accessToken
    );
  },

  /**
   * Delete query
   */
  delete: async (
    queryId: string,
    accessToken: string
  ): Promise<{ message: string; id: string }> => {
    return apiRequest<{ message: string; id: string }>(
      `/api/queries/${queryId}`,
      { method: 'DELETE' },
      accessToken
    );
  },

  /**
   * Build SSE stream URL with query parameters
   */
  buildStreamUrl: (params: {
    query: string;
    spaceId?: string;
    userId?: string;
    saveToDb?: boolean;
  }): string => {
    const searchParams = new URLSearchParams({
      query: params.query,
      ...(params.spaceId && { space_id: params.spaceId }),
      ...(params.userId && { user_id: params.userId }),
      ...(params.saveToDb !== undefined && {
        save_to_db: String(params.saveToDb),
      }),
    });

    return `${API_BASE_URL}/api/query/stream?${searchParams.toString()}`;
  },
};
