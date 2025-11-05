'use client';

import { useSpace } from '@/contexts/SpaceContext';
import { useThreadsPanel } from '@/contexts/ThreadsPanelContext';
import type { QueryResult } from '@/hooks/useQueryResults';
import { useStreamingQuery } from '@/hooks/useStreamingQuery';
import type { Citation } from '@/lib/api/queries-client';
import { ScrollArea } from '@olympus/ui';
import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/client';
import { ThreadsEmptyState } from '../threads/ThreadsEmptyState';
import { QueryMessage } from './QueryMessage';
import { QueryResponse } from './QueryResponse';
import { CitationList } from './CitationList';
import { ThreadInput } from './ThreadInput';

interface ThreadInterfaceProps {
  onQuerySubmit?: () => void;
  onThreadCreated?: (threadId: string) => void;
  initialThread?: QueryResult;
}

/**
 * ThreadInterface is the main chat component for the threads system.
 *
 * Features:
 * - Chat-style conversation display (Hex-inspired design)
 * - Real-time streaming responses
 * - Citation display with source links
 * - Thread input with keyboard shortcuts
 * - Clean, constrained-width interface
 * - Uses SpaceContext for spaceId access
 * - Can load initial thread data for existing conversations
 * - Navigates to new thread page after first message
 *
 * @example
 * // New conversation
 * <ThreadInterface />
 *
 * // Load existing thread
 * <ThreadInterface initialThread={threadData} />
 */
export function ThreadInterface({
  onQuerySubmit,
  onThreadCreated,
  initialThread,
}: ThreadInterfaceProps) {
  const { spaceId } = useSpace();
  const { minimize } = useThreadsPanel();
  const queryClient = useQueryClient();
  const [currentQuery, setCurrentQuery] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
      citations?: Citation[];
      confidenceScore?: number;
    }>
  >(() => {
    // Initialize conversation history from initialThread if provided
    if (initialThread) {
      return [
        {
          role: 'user',
          content: initialThread.queryText,
          timestamp: new Date(initialThread.createdAt),
        },
        ...(initialThread.result
          ? [
              {
                role: 'assistant' as const,
                content: initialThread.result,
                timestamp: new Date(initialThread.updatedAt),
                citations: initialThread.sources || [],
                confidenceScore: initialThread.confidenceScore || undefined,
              },
            ]
          : []),
      ];
    }
    return [];
  });

  const {
    response,
    citations,
    confidenceScore,
    isStreaming,
    error,
    errorCode,
    retryCount,
    queryId,
    startStreaming,
    retry,
    reset,
  } = useStreamingQuery();

  // Track which queryId we've added to conversation history to prevent duplicates
  const addedQueryId = useRef<string | null>(null);

  // Auto-minimize ThreadsPanel when streaming starts on first message
  useEffect(() => {
    // Only minimize if this is the first message (new conversation)
    const isFirstMessage = conversationHistory.length === 1;
    if (isStreaming && isFirstMessage) {
      minimize();
    }
  }, [isStreaming, conversationHistory.length, minimize]);

  // Populate cache with thread data when streaming completes
  // This prevents loading state when navigating to individual thread page
  useEffect(() => {
    if (!isStreaming && queryId && currentQuery && response) {
      // Build thread data that matches GraphQL query shape
      const threadData = {
        query: {
          id: queryId,
          queryText: currentQuery,
          result: response,
          confidenceScore: confidenceScore || null,
          sources: citations, // Include citations so they persist
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Populate cache so individual thread page loads instantly
      queryClient.setQueryData(queryKeys.threads.detail(queryId), threadData);
    }
  }, [
    isStreaming,
    queryId,
    currentQuery,
    response,
    confidenceScore,
    citations,
    queryClient,
  ]);

  // Navigate to new thread when queryId becomes available
  useEffect(() => {
    // If we have a queryId and no initialThread, this is a new conversation
    // Navigate to the individual thread page
    if (queryId && !initialThread && onThreadCreated) {
      onThreadCreated(queryId);
    }
  }, [queryId, initialThread, onThreadCreated]);

  // Add assistant response to conversation when streaming completes
  useEffect(() => {
    // When streaming completes and we have a response, add it to conversation history
    // Only add if:
    // 1. Streaming is complete (!isStreaming)
    // 2. We have a response
    // 3. We have a queryId (streaming completed successfully)
    // 4. We haven't already added this queryId to history
    // 5. The last message is from the user (we haven't added assistant response yet)
    if (
      !isStreaming &&
      response &&
      queryId &&
      addedQueryId.current !== queryId &&
      conversationHistory.length > 0 &&
      conversationHistory[conversationHistory.length - 1].role === 'user'
    ) {
      setConversationHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          citations,
          confidenceScore: confidenceScore || undefined,
        },
      ]);
      // Mark this queryId as added to prevent duplicates
      addedQueryId.current = queryId;
    }
  }, [
    isStreaming,
    response,
    queryId,
    conversationHistory,
    citations,
    confidenceScore,
  ]);

  // Handle new query submission
  const handleSubmitQuery = async (query: string) => {
    setCurrentQuery(query);

    // Notify parent that a query was submitted
    onQuerySubmit?.();

    // Add user message to conversation
    setConversationHistory((prev) => [
      ...prev,
      {
        role: 'user',
        content: query,
        timestamp: new Date(),
      },
    ]);

    try {
      // Start streaming response
      await startStreaming({
        query,
        spaceId,
        saveToDb: true, // Save to database for history
      });
      // Note: Assistant response will be added by useEffect when streaming completes
    } catch (err) {
      console.error('Query streaming failed:', err);
    }
  };

  // Handle retry on error - use the retry method from useStreamingQuery
  const handleRetry = async () => {
    try {
      await retry();
      // Note: Assistant response will be added by useEffect when streaming completes
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  // Determine if we should show the active streaming response
  // Show it while streaming OR after completion but before adding to history
  const lastMessageIsFromUser =
    conversationHistory.length > 0 &&
    conversationHistory[conversationHistory.length - 1].role === 'user';
  const shouldShowActiveResponse =
    isStreaming || (response && lastMessageIsFromUser && !error);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container - Constrained width matching input */}
      <ScrollArea className="flex-1 p-0">
        {/* Conversation History - Constrained width container */}
        {conversationHistory.length > 0 && (
          <div className="max-w-3xl mx-auto">
            {conversationHistory.map((message, index) => (
              <div key={index}>
                <QueryMessage
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  confidenceScore={message.confidenceScore}
                />
                {/* Show citations for assistant messages */}
                {message.role === 'assistant' &&
                  message.citations &&
                  message.citations.length > 0 && (
                    <div className="px-4 pb-4">
                      <CitationList citations={message.citations} />
                    </div>
                  )}
              </div>
            ))}

            {/* Active Streaming Response - Only show while actively streaming or completed but not yet in history */}
            {shouldShowActiveResponse && (
              <QueryResponse
                response={response}
                citations={citations}
                isStreaming={isStreaming}
                error={error}
                errorCode={errorCode}
                retryCount={retryCount}
                confidenceScore={confidenceScore}
                onRetry={handleRetry}
              />
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area - Empty state sits naturally above input */}
      <div className="flex-shrink-0">
        {/* Empty State - Shows above input when no messages */}
        {conversationHistory.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center py-12">
            <ThreadsEmptyState />
          </div>
        )}

        {/* Thread Input (Fixed at Bottom) - Same width as messages */}
        <ThreadInput onSubmit={handleSubmitQuery} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
