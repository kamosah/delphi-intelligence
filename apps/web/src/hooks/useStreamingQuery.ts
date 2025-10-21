'use client';

import { useCallback, useRef, useState } from 'react';
import {
  queriesApi,
  type Citation,
  type SSEEvent,
} from '@/lib/api/queries-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/client';

interface StreamingState {
  response: string;
  citations: Citation[];
  confidenceScore: number | null;
  isStreaming: boolean;
  error: string | null;
  queryId: string | null;
}

/**
 * Custom hook for streaming query responses using Server-Sent Events (SSE).
 *
 * Handles real-time token streaming, citation extraction, and confidence scoring
 * from the backend RAG pipeline.
 *
 * @example
 * const { response, citations, isStreaming, startStreaming, stopStreaming } = useStreamingQuery();
 *
 * const handleSubmit = async (query: string) => {
 *   await startStreaming({
 *     query,
 *     spaceId: 'space-123',
 *     saveToDb: true,
 *   });
 * };
 */
export function useStreamingQuery() {
  const { accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const [state, setState] = useState<StreamingState>({
    response: '',
    citations: [],
    confidenceScore: null,
    isStreaming: false,
    error: null,
    queryId: null,
  });

  /**
   * Start streaming a query response
   */
  const startStreaming = useCallback(
    (params: {
      query: string;
      spaceId?: string;
      saveToDb?: boolean;
    }): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Validate authentication
        if (!accessToken) {
          const error = 'Authentication required';
          setState((prev) => ({ ...prev, error, isStreaming: false }));
          reject(new Error(error));
          return;
        }

        // Clean up any existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Reset state
        setState({
          response: '',
          citations: [],
          confidenceScore: null,
          isStreaming: true,
          error: null,
          queryId: null,
        });

        // Build stream URL with auth token
        const streamUrl = queriesApi.buildStreamUrl({
          query: params.query,
          spaceId: params.spaceId,
          userId: user?.id,
          saveToDb: params.saveToDb,
        });

        // Create EventSource with auth token in URL
        // Note: EventSource doesn't support custom headers, so we pass token as query param
        const eventSource = new EventSource(
          `${streamUrl}&token=${accessToken}`
        );
        eventSourceRef.current = eventSource;

        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            const data: SSEEvent = JSON.parse(event.data);

            switch (data.type) {
              case 'token':
                // Append token to response
                setState((prev) => ({
                  ...prev,
                  response: prev.response + data.content,
                }));
                break;

              case 'citations':
                // Update citations and confidence score
                setState((prev) => ({
                  ...prev,
                  citations: data.sources,
                  confidenceScore: data.confidence_score,
                }));
                break;

              case 'done':
                // Streaming complete
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  confidenceScore: data.confidence_score,
                  queryId: data.query_id || null,
                }));

                // Invalidate query history to refetch with new query
                if (params.spaceId && params.saveToDb) {
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.queries.list({
                      spaceId: params.spaceId,
                    }),
                  });
                }

                eventSource.close();
                resolve();
                break;

              case 'error':
                // Handle error from backend
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: data.message,
                }));
                eventSource.close();
                reject(new Error(data.message));
                break;
            }
          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError);
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: 'Failed to parse response from server',
            }));
            eventSource.close();
            reject(parseError);
          }
        };

        // Handle connection errors
        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: 'Connection error occurred. Please try again.',
          }));
          eventSource.close();
          reject(new Error('SSE connection error'));
        };
      });
    },
    [accessToken, user?.id, queryClient]
  );

  /**
   * Manually stop streaming
   */
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    stopStreaming();
    setState({
      response: '',
      citations: [],
      confidenceScore: null,
      isStreaming: false,
      error: null,
      queryId: null,
    });
  }, [stopStreaming]);

  return {
    response: state.response,
    citations: state.citations,
    confidenceScore: state.confidenceScore,
    isStreaming: state.isStreaming,
    error: state.error,
    queryId: state.queryId,
    startStreaming,
    stopStreaming,
    reset,
  };
}
