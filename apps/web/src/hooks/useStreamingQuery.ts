'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  MAX_RETRY_ATTEMPTS,
  MAX_RETRY_DELAY_MS,
  NON_RETRYABLE_ERRORS,
  RETRY_DELAY_MS,
} from '@/constants/streaming';
import type { GetThreadQuery } from '@/lib/api/generated';
import { MessageRole, ThreadStatusEnum } from '@/lib/api/generated';
import { buildStreamUrl, type SSEEvent } from '@/lib/api/queries-client';
import { queryKeys } from '@/lib/query/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useStreamingStore } from '@/lib/stores/streaming-store';
import type { MessageMetadata } from '@/types/ui/messages';

/**
 * Custom hook for streaming query responses using Server-Sent Events (SSE).
 *
 * Handles real-time token streaming, citation extraction, confidence scoring,
 * and automatic reconnection on transient failures with exponential backoff.
 *
 * Supports both new thread creation and multi-turn continuation of existing threads.
 *
 * **State Management**:
 * - All streaming state stored in Zustand streaming store
 * - State persists across navigation and page refreshes
 * - Supports multiple concurrent streams
 *
 * @example New thread
 * const { threadId, isStreaming, startStreaming } = useStreamingQuery();
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
 *
 * @example Continue existing thread (multi-turn)
 * await startStreaming({
 *   query: 'Tell me more about that',
 *   threadId: 'thread-123',
 *   saveToDb: true,
 * });
 */
export function useStreamingQuery(threadId?: string) {
  const { accessToken, user } = useAuthStore();
  const {
    getSession,
    startSession,
    updateSession,
    endSession,
    removeSession,
    cleanupStale,
  } = useStreamingStore();
  const queryClient = useQueryClient();

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentParamsRef = useRef<{
    query: string;
    threadId?: string;
    organizationId?: string;
    spaceId?: string;
    saveToDb?: boolean;
  } | null>(null);

  // Token batching with requestAnimationFrame (reduces re-renders from ~100/sec to ~60fps)
  const batchRef = useRef<{
    tokens: string[];
    rafId: number | null;
  }>({
    tokens: [],
    rafId: null,
  });

  // Clean up stale sessions on mount and periodically (every 5 minutes)
  useEffect(() => {
    cleanupStale();
    const intervalId = setInterval(
      () => {
        cleanupStale();
      },
      5 * 60 * 1000
    ); // 5 minutes
    return () => {
      clearInterval(intervalId);
    };
  }, [cleanupStale]);

  // Track the current thread ID being processed
  const currentThreadIdRef = useRef<string | null>(null);

  // Get current session state from store
  const session = threadId
    ? getSession(threadId)
    : currentThreadIdRef.current
      ? getSession(currentThreadIdRef.current)
      : null;

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
        threadId?: string;
        organizationId?: string;
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

        // Clear any pending token batch
        if (batchRef.current.rafId) {
          cancelAnimationFrame(batchRef.current.rafId);
          batchRef.current.rafId = null;

          // Flush remaining tokens before clearing to prevent token loss
          const activeId = threadId || currentThreadIdRef.current;
          if (activeId && batchRef.current.tokens.length > 0) {
            const batch = batchRef.current.tokens.join('');
            const currentSession = getSession(activeId);
            updateSession(activeId, {
              response: (currentSession?.response || '') + batch,
            });
          }

          batchRef.current.tokens = [];
        }

        // Build stream URL with auth token
        const streamUrl = buildStreamUrl({
          query: params.query,
          threadId: params.threadId,
          organizationId: params.organizationId,
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
              // Get active thread ID (from param or ref)
              const activeId = threadId || currentThreadIdRef.current;

              switch (data.type) {
                case 'start':
                  // Thread created - start session in store immediately
                  currentThreadIdRef.current = data.thread_id;
                  startSession(data.thread_id, params.query);
                  updateSession(data.thread_id, {
                    retryCount,
                  });

                  // Optimistically update React Query cache with user message
                  queryClient.setQueryData<GetThreadQuery>(
                    queryKeys.threads.detail(data.thread_id),
                    {
                      thread: {
                        __typename: 'Thread',
                        id: data.thread_id,
                        queryText: params.query,
                        organizationId: params.organizationId || '',
                        spaceId: params.spaceId || null,
                        createdBy: user?.id || '',
                        createdAt: new Date().toISOString(),
                        status: ThreadStatusEnum.Processing,
                        messages: [
                          {
                            __typename: 'Message',
                            id: `temp-user-${Date.now()}`,
                            threadId: data.thread_id,
                            messageRole: MessageRole.User,
                            content: params.query,
                            messageMetadata: {} satisfies MessageMetadata,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          },
                        ],
                        result: null,
                        sources: null,
                        confidenceScore: null,
                        agentSteps: null,
                        errorMessage: null,
                        completedAt: null,
                        processingTimeMs: null,
                        modelUsed: null,
                        costUsd: null,
                        title: null,
                        context: null,
                        updatedAt: new Date().toISOString(),
                      },
                    }
                  );
                  break;

                case 'token':
                  // Batch tokens using requestAnimationFrame (~60fps instead of ~100/sec)
                  batchRef.current.tokens.push(data.content);

                  if (!batchRef.current.rafId) {
                    batchRef.current.rafId = requestAnimationFrame(() => {
                      const batch = batchRef.current.tokens.join('');
                      batchRef.current.tokens = [];
                      batchRef.current.rafId = null;

                      if (activeId) {
                        const currentSession = getSession(activeId);
                        updateSession(activeId, {
                          response: (currentSession?.response || '') + batch,
                        });
                      }
                    });
                  }
                  break;

                case 'replace':
                  // Replace entire response (used for low-confidence fallback)
                  if (activeId) {
                    updateSession(activeId, {
                      response: data.content,
                    });
                  }
                  break;

                case 'citations':
                  // Update citations and confidence score
                  if (activeId) {
                    updateSession(activeId, {
                      citations: data.sources,
                      confidenceScore: data.confidence_score,
                    });
                  }
                  break;

                case 'done':
                  // Streaming complete
                  if (activeId) {
                    updateSession(activeId, {
                      confidenceScore: data.confidence_score,
                      retryCount: 0, // Reset retry count on success
                    });
                    endSession(activeId);

                    // Manually update React Query cache with final assistant message
                    const currentSession = getSession(activeId);
                    if (currentSession) {
                      queryClient.setQueryData<GetThreadQuery>(
                        queryKeys.threads.detail(activeId),
                        (oldData) => {
                          if (!oldData?.thread) return oldData;

                          return {
                            thread: {
                              ...oldData.thread,
                              status: ThreadStatusEnum.Completed,
                              result: currentSession.response,
                              sources: currentSession.citations,
                              confidenceScore: data.confidence_score,
                              completedAt: new Date().toISOString(),
                              messages: [
                                ...oldData.thread.messages,
                                {
                                  __typename: 'Message',
                                  id: `assistant-${Date.now()}`,
                                  threadId: activeId,
                                  messageRole: MessageRole.Assistant,
                                  content: currentSession.response,
                                  messageMetadata: {
                                    citations: currentSession.citations,
                                    confidence_score: data.confidence_score,
                                  } satisfies MessageMetadata,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                },
                              ],
                            },
                          };
                        }
                      );
                    }
                  }

                  // Note: No query invalidation - we manually updated the cache above
                  // This prevents unnecessary refetch and ensures smooth UX

                  // Clean up streaming session after short delay (allows UI to read final state)
                  cleanupTimeoutRef.current = setTimeout(() => {
                    if (activeId) {
                      removeSession(activeId);
                    }
                    cleanupTimeoutRef.current = null;
                  }, 1000);

                  eventSource.close();
                  resolve();
                  break;

                case 'error':
                  // Handle error from backend
                  const error = new Error(data.message) as Error & {
                    errorCode?: string;
                  };
                  error.errorCode = data.error_code || 'UNKNOWN';

                  if (activeId) {
                    updateSession(activeId, {
                      isStreaming: false,
                      error: data.message,
                      errorCode: error.errorCode,
                    });
                  }

                  eventSource.close();
                  reject(error);
                  break;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);

              const activeId = threadId || currentThreadIdRef.current;
              if (activeId) {
                updateSession(activeId, {
                  isStreaming: false,
                  error: 'Failed to parse response from server',
                  errorCode: 'PARSE_ERROR',
                });
              }

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
        const errorCode =
          (error as Error & { errorCode?: string }).errorCode || 'UNKNOWN';

        // Determine if we should retry
        const canRetry =
          isRetryableError(errorCode) && retryCount < MAX_RETRY_ATTEMPTS;

        if (canRetry) {
          const delay = getRetryDelay(retryCount);
          console.log(
            `Retrying query in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`
          );

          const activeId = threadId || currentThreadIdRef.current;
          if (activeId) {
            updateSession(activeId, {
              isStreaming: false,
              error: `${errorMessage} Retrying (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`,
              retryCount: retryCount + 1,
            });
          }

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
        const activeId = threadId || currentThreadIdRef.current;
        if (activeId) {
          updateSession(activeId, {
            isStreaming: false,
            error: errorMessage,
            errorCode,
          });
        }

        throw error;
      }
    },
    [
      accessToken,
      user?.id,
      threadId,
      startSession,
      updateSession,
      endSession,
      getSession,
      queryClient,
      removeSession,
    ]
  );

  /**
   * Start streaming a query response
   */
  const startStreaming = useCallback(
    async (params: {
      query: string;
      threadId?: string;
      organizationId?: string;
      spaceId?: string;
      saveToDb?: boolean;
    }): Promise<void> => {
      // Store params for manual retry
      currentParamsRef.current = params;

      // If threadId provided, start session for that thread and store user query
      // Otherwise, session will be created when 'start' event arrives
      if (params.threadId) {
        currentThreadIdRef.current = params.threadId;
        startSession(params.threadId, params.query);
      }

      return startStreamingInternal(params, 0);
    },
    [startStreamingInternal, startSession]
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

    // Cancel pending cleanup timeout
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Clear any pending token batch
    if (batchRef.current.rafId) {
      cancelAnimationFrame(batchRef.current.rafId);
      batchRef.current.rafId = null;

      // Flush remaining tokens before clearing to prevent token loss
      const activeId = threadId || currentThreadIdRef.current;
      if (activeId && batchRef.current.tokens.length > 0) {
        const batch = batchRef.current.tokens.join('');
        const currentSession = getSession(activeId);
        updateSession(activeId, {
          response: (currentSession?.response || '') + batch,
        });
      }

      batchRef.current.tokens = [];
    }

    // Mark session as not streaming
    const activeId = threadId || currentThreadIdRef.current;
    if (activeId) {
      updateSession(activeId, {
        isStreaming: false,
      });
    }
  }, [threadId, updateSession, getSession]);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    stopStreaming();
    currentParamsRef.current = null;
    // Note: We don't clear the store session here, as it may be needed for navigation recovery
  }, [stopStreaming]);

  return {
    // State from store
    response: session?.response || '',
    citations: session?.citations || [],
    confidenceScore: session?.confidenceScore || null,
    isStreaming: session?.isStreaming || false,
    error: session?.error || null,
    errorCode: session?.errorCode,
    threadId: threadId || currentThreadIdRef.current || null,
    retryCount: session?.retryCount || 0,

    // Actions
    startStreaming,
    stopStreaming,
    retry,
    reset,
  };
}
