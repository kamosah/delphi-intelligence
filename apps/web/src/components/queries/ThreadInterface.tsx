'use client';

import { useSpace } from '@/contexts/SpaceContext';
import type { QueryResult } from '@/hooks/useQueryResults';
import { useStreamingQuery } from '@/hooks/useStreamingQuery';
import { ScrollArea } from '@olympus/ui';
import { useState } from 'react';
import { ThreadsEmptyState } from '../threads/ThreadsEmptyState';
import { ThreadInput } from './ThreadInput';
import { QueryMessage } from './QueryMessage';
import { QueryResponse } from './QueryResponse';

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
  const [currentQuery, setCurrentQuery] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>
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

      // After streaming completes, add assistant response to conversation
      setConversationHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);

      // Notify parent of thread creation if this was a new thread
      if (queryId && onThreadCreated) {
        onThreadCreated(queryId);
      }
    } catch (err) {
      console.error('Query streaming failed:', err);
    }
  };

  // Handle retry on error - use the retry method from useStreamingQuery
  const handleRetry = async () => {
    try {
      await retry();

      // After retry completes successfully, add assistant response to conversation
      setConversationHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container - Constrained width matching input */}
      <ScrollArea className="flex-1 p-0">
        {/* Conversation History - Constrained width container */}
        {conversationHistory.length > 0 && (
          <div className="max-w-4xl mx-auto">
            {conversationHistory.map((message, index) => (
              <QueryMessage
                key={index}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}

            {/* Active Streaming Response */}
            {(isStreaming || response) && (
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
