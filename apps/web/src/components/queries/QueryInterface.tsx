'use client';

import { useState } from 'react';
import { useStreamingQuery } from '@/hooks/useStreamingQuery';
import type { Query } from '@/lib/api/queries-client';
import { QueryHistory } from './QueryHistory';
import { QueryInput } from './QueryInput';
import { QueryMessage } from './QueryMessage';
import { QueryResponse } from './QueryResponse';
import { ScrollArea } from '@olympus/ui';
import { MessageSquarePlus } from 'lucide-react';

interface QueryInterfaceProps {
  spaceId: string;
}

/**
 * QueryInterface is the main container component for the chat-style query system.
 *
 * Features:
 * - History sidebar with past queries
 * - Chat-style conversation display
 * - Real-time streaming responses
 * - Citation display with source links
 * - Query input with keyboard shortcuts
 * - Responsive layout (mobile/tablet/desktop)
 *
 * @example
 * <QueryInterface spaceId="space-123" />
 */
export function QueryInterface({ spaceId }: QueryInterfaceProps) {
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
    startStreaming,
    reset,
  } = useStreamingQuery();

  // Handle new query submission
  const handleSubmitQuery = async (query: string) => {
    setCurrentQuery(query);

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

  // Handle loading a previous query from history
  const handleSelectHistoryQuery = (query: Query) => {
    // Clear current state
    reset();

    // Load the historical query and response into the conversation
    setCurrentQuery(query.query_text);
    setConversationHistory([
      {
        role: 'user',
        content: query.query_text,
        timestamp: new Date(query.created_at),
      },
      ...(query.result
        ? [
            {
              role: 'assistant' as const,
              content: query.result,
              timestamp: new Date(query.updated_at),
            },
          ]
        : []),
    ]);
  };

  // Handle retry on error
  const handleRetry = () => {
    if (currentQuery) {
      handleSubmitQuery(currentQuery);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* History Sidebar */}
      <QueryHistory
        spaceId={spaceId}
        onSelectQuery={handleSelectHistoryQuery}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
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
              confidenceScore={confidenceScore}
              onRetry={handleRetry}
            />
          )}
        </ScrollArea>

        {/* Query Input (Fixed at Bottom) */}
        <QueryInput onSubmit={handleSubmitQuery} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
