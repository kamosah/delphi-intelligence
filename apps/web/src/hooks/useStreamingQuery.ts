'use client';

import { useCallback, useRef, useState } from 'react';
import {
  buildStreamUrl,
  type Citation,
  type SSEEvent,
} from '@/lib/api/queries-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/client';
import {
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  NON_RETRYABLE_ERRORS,
} from '@/constants/streaming';

interface StreamingState {
  response: string;
  citations: Citation[];
  confidenceScore: number | null;
  isStreaming: boolean;
  error: string | null;
  queryId: string | null;
  retryCount: number;
  errorCode?: string;
}

/**
 * Custom hook for streaming query responses using Server-Sent Events (SSE).
 *
 * Handles real-time token streaming, citation extraction, confidence scoring,
 * and automatic reconnection on transient failures with exponential backoff.
 *
 * @example
 * const { response, citations, isStreaming, startStreaming, stopStreaming, retry } = useStreamingQuery();
 *
 * const handleSubmit = async (query: string) => {
 *   try {
 *     await startStreaming({
 *       query,
 *       spaceId: 'space-123',
 *       saveToDb: true,
 *     });
 *   } catch (error) {
 *     console.error('Query failed:', error);
 *   }
 * };
 */
export function useStreamingQuery() {
  const { accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentParamsRef = useRef<{
    query: string;
    spaceId?: string;
    saveToDb?: boolean;
  } | null>(null);

  const [state, setState] = useState<StreamingState>({
    response: '',
    citations: [],
    confidenceScore: null,
    isStreaming: false,
    error: null,
    queryId: null,
    retryCount: 0,
  });

  /**
   * Calculate exponential backoff delay
   */
  const getRetryDelay = (retryCount: number): number => {
    const delay = Math.min(
      RETRY_DELAY_MS * Math.pow(2, retryCount),
      MAX_RETRY_DELAY_MS
    );
    return delay;
  };

  /**
   * Check if error is retryable
   */
  const isRetryableError = (errorCode?: string): boolean => {
    const code = errorCode ?? 'UNKNOWN';
    return !NON_RETRYABLE_ERRORS.includes(code);
  };

  /**
   * Internal streaming implementation with automatic retry
   */
  const startStreamingInternal = useCallback(
    async (
      params: {
        query: string;
        spaceId?: string;
        saveToDb?: boolean;
      },
      retryCount: number = 0
    ): Promise<void> => {
      try {
        // Validate authentication
        if (!accessToken) {
          throw new Error('Authentication required');
        }

        // Clean up any existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Clear any pending retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        // Update state
        setState((prev) => ({
          ...prev,
          isStreaming: true,
          error: null,
          retryCount,
        }));

        // Build stream URL with auth token
        const streamUrl = buildStreamUrl({
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

        // Wait for stream completion or error
        await new Promise<void>((resolve, reject) => {
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

                case 'replace':
                  // Replace entire response (used for low-confidence fallback)
                  setState((prev) => ({
                    ...prev,
                    response: data.content,
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
                    retryCount: 0, // Reset retry count on success
                  }));

                  // Invalidate query history to refetch with new query
                  if (params.spaceId && params.saveToDb) {
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.threads.list({
                        spaceId: params.spaceId,
                      }),
                    });
                  }

                  eventSource.close();
                  resolve();
                  break;

                case 'error':
                  // Handle error from backend
                  const error = new Error(data.message) as Error & {
                    errorCode?: string;
                  };
                  error.errorCode = data.error_code;

                  setState((prev) => ({
                    ...prev,
                    isStreaming: false,
                    error: data.message,
                    errorCode: data.error_code,
                  }));

                  eventSource.close();
                  reject(error);
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
          eventSource.onerror = () => {
            console.error('SSE connection error');
            eventSource.close();
            reject(new Error('Connection error'));
          };
        });
      } catch (error) {
        // All errors flow through here - single error handling point!
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = (error as Error & { errorCode?: string }).errorCode;

        // Determine if we should retry
        const canRetry =
          isRetryableError(errorCode) && retryCount < MAX_RETRY_ATTEMPTS;

        if (canRetry) {
          const delay = getRetryDelay(retryCount);
          console.log(
            `Retrying query in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`
          );

          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: `${errorMessage} Retrying (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`,
          }));

          // Wait for backoff delay with cancellable timeout
          await new Promise<void>((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(() => {
              // Check if timeout was cleared (cancelled) before completion
              if (retryTimeoutRef.current === null) {
                reject(new Error('Retry cancelled by user'));
                return;
              }
              // Otherwise, proceed
              retryTimeoutRef.current = null;
              resolve();
            }, delay);
          });

          // Retry recursively
          return startStreamingInternal(params, retryCount + 1);
        }

        // Max retries exceeded or non-retryable error
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: errorMessage,
          errorCode,
        }));

        throw error;
      }
    },
    [accessToken, user?.id, queryClient]
  );

  /**
   * Start streaming a query response
   */
  const startStreaming = useCallback(
    async (params: {
      query: string;
      spaceId?: string;
      saveToDb?: boolean;
    }): Promise<void> => {
      // Store params for manual retry
      currentParamsRef.current = params;

      // Reset state
      setState({
        response: '',
        citations: [],
        confidenceScore: null,
        isStreaming: true,
        error: null,
        queryId: null,
        retryCount: 0,
      });

      return startStreamingInternal(params, 0);
    },
    [startStreamingInternal]
  );

  /**
   * Manually retry the last failed query
   */
  const retry = useCallback(async () => {
    if (!currentParamsRef.current) {
      const error = new Error('No previous query to retry');
      console.warn(error.message);
      throw error;
    }

    return startStreaming(currentParamsRef.current);
  }, [startStreaming]);

  /**
   * Manually stop streaming and cancel any pending retries
   */
  const stopStreaming = useCallback(() => {
    // Close active EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Cancel pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
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
    currentParamsRef.current = null;
    setState({
      response: '',
      citations: [],
      confidenceScore: null,
      isStreaming: false,
      error: null,
      queryId: null,
      retryCount: 0,
    });
  }, [stopStreaming]);

  return {
    response: state.response,
    citations: state.citations,
    confidenceScore: state.confidenceScore,
    isStreaming: state.isStreaming,
    error: state.error,
    errorCode: state.errorCode,
    queryId: state.queryId,
    retryCount: state.retryCount,
    startStreaming,
    stopStreaming,
    retry,
    reset,
  };
}
