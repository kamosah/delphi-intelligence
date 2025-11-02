'use client';

import type { QueryResult } from '@/hooks/useQueryResults';
import { useStreamingQuery } from '@/hooks/useStreamingQuery';
import { ScrollArea } from '@olympus/ui';
import { MessageSquarePlus } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { QueryInput } from './QueryInput';
import { QueryMessage } from './QueryMessage';
import { QueryResponse } from './QueryResponse';

interface QueryInterfaceProps {
  spaceId: string;
  onQuerySubmit?: () => void;
}

export interface QueryInterfaceRef {
  loadQuery: (query: QueryResult) => void;
}

/**
 * QueryInterface is the main chat component for the query system.
 *
 * Features:
 * - Chat-style conversation display
 * - Real-time streaming responses
 * - Citation display with source links
 * - Query input with keyboard shortcuts
 * - Clean, full-width interface
 *
 *
 * @example
 * const ref = useRef<QueryInterfaceRef>(null);
 * <QueryInterface ref={ref} spaceId="space-123" />
 */
export const QueryInterface = forwardRef<
  QueryInterfaceRef,
  QueryInterfaceProps
>(function QueryInterface({ spaceId, onQuerySubmit }, ref) {
  const [currentQuery, setCurrentQuery] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>
  >([]);

  const {
    response,
    citations,
    confidenceScore,
    isStreaming,
    error,
    errorCode,
    retryCount,
    startStreaming,
    retry,
    reset,
  } = useStreamingQuery();

  // Handle loading a previous query from history
  const handleSelectHistoryQuery = (query: QueryResult) => {
    // Clear current state
    reset();

    // Load the historical query and response into the conversation
    setCurrentQuery(query.queryText);
    setConversationHistory([
      {
        role: 'user',
        content: query.queryText,
        timestamp: new Date(query.createdAt),
      },
      ...(query.result
        ? [
            {
              role: 'assistant' as const,
              content: query.result,
              timestamp: new Date(query.updatedAt),
            },
          ]
        : []),
    ]);
  };

  // Expose loadQuery method to parent via ref
  useImperativeHandle(ref, () => ({
    loadQuery: handleSelectHistoryQuery,
  }));

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
      {/* Messages Container */}
      <ScrollArea className="flex-1 p-0">
        {/* Empty State */}
        {conversationHistory.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <MessageSquarePlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ask Athena AI
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Ask questions about your documents and get AI-powered answers
                with source citations in real-time.
              </p>
              <div className="text-left space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  Example questions:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• What are the key risks mentioned?</li>
                  <li>• Summarize the financial projections</li>
                  <li>• What are the main recommendations?</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.map((message, index) => (
          <QueryMessage
            key={index}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}

        {/* Active Streaming Response */}
        {(isStreaming || response) && conversationHistory.length > 0 && (
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
      </ScrollArea>

      {/* Query Input (Fixed at Bottom) */}
      <QueryInput onSubmit={handleSubmitQuery} isStreaming={isStreaming} />
    </div>
  );
});
