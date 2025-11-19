'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, ScrollArea } from '@olympus/ui';
import { useThreadsPanel } from '@/contexts/ThreadsPanelContext';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useStreamingQuery } from '@/hooks/useStreamingQuery';
import type { Thread } from '@/hooks/useThreads';
import type { Citation } from '@/lib/api/queries-client';
import { useAuthStore } from '@/lib/stores';
import { ThreadsEmptyState } from '../threads/ThreadsEmptyState';
import { CitationList } from './CitationList';
import { ThreadInput } from './ThreadInput';
import { ThreadMessage } from './ThreadMessage';
import { ThreadResponse } from './ThreadResponse';

interface ThreadInterfaceProps {
  onMessageSubmit?: () => void;
  onThreadCreated?: (threadId: string) => void;
  initialThread?: Thread;
  spaceId?: string;
}

/**
 * ThreadInterface is the main chat component for the threads system.
 *
 * Features:
 * - Chat-style conversation display (Hex-inspired design)
 * - Real-time streaming responses with immediate navigation
 * - Multi-turn conversation support (ChatGPT-style follow-ups)
 * - Loads full conversation history from backend messages
 * - Citation display with source links
 * - Thread input with keyboard shortcuts
 * - Clean, constrained-width interface
 * - Supports both org-wide and space-scoped threads
 * - Uses Zustand auth store for organization context
 * - Can load initial thread data for existing conversations
 * - Navigates to thread page IMMEDIATELY when thread is created (before streaming completes)
 * - Uses Zustand streaming store for persistent state across navigation
 *
 * @example
 * // New org-wide conversation (uses currentOrganization from Zustand)
 * <ThreadInterface />
 *
 * // Space-scoped conversation
 * <ThreadInterface spaceId="space-uuid" />
 *
 * // Load existing thread with full message history (multi-turn)
 * <ThreadInterface initialThread={threadData} />
 */
export function ThreadInterface({
  onMessageSubmit,
  onThreadCreated,
  initialThread,
  spaceId,
}: ThreadInterfaceProps) {
  const { currentOrganization } = useAuthStore();
  const { minimize } = useThreadsPanel();
  const [conversationHistory, setConversationHistory] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
      citations?: Citation[];
      confidenceScore?: number;
      isFailed?: boolean;
    }>
  >(() => {
    // Initialize conversation history from initialThread messages if provided
    if (initialThread?.messages && initialThread.messages.length > 0) {
      return (
        initialThread.messages
          // Filter out system messages (internal prompts, not for display)
          .filter((msg) => msg.messageRole !== 'SYSTEM')
          .map((msg) => ({
            id: msg.id,
            role: msg.messageRole.toLowerCase() as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.createdAt),
            citations: msg.messageMetadata?.citations,
            confidenceScore: msg.messageMetadata?.confidence_score,
          }))
      );
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
    threadId,
    startStreaming,
    retry,
  } = useStreamingQuery(initialThread?.id);

  // Track which response we've added to conversation history to prevent duplicates
  // Use response content hash to detect new responses in multi-turn conversations
  const addedResponseHash = useRef<string | null>(null);

  // Track the ID of the last user message to mark as failed on error
  const lastUserMessageId = useRef<string | null>(null);

  // Auto-scroll hook for managing scroll behavior and scroll-to-bottom button
  const {
    scrollAreaRef,
    showScrollButton,
    handleScrollToBottom,
    handleButtonMouseEnter,
    handleButtonMouseLeave,
  } = useAutoScroll({
    isStreaming,
    response,
    messageCount: conversationHistory.length,
  });

  // Note: No longer need to set activeThreadId - removed from store
  // Each component determines its own threadId from props/params

  // Auto-minimize ThreadsPanel when streaming starts on first message
  useEffect(() => {
    // Only minimize if this is the first message (new conversation)
    const isFirstMessage = conversationHistory.length === 1;
    if (isStreaming && isFirstMessage) {
      minimize();
    }
  }, [isStreaming, conversationHistory.length, minimize]);

  // Navigate IMMEDIATELY when threadId becomes available from "start" event
  // This allows navigation while streaming is still in progress
  useEffect(() => {
    // If we have a threadId and no initialThread, this is a new conversation
    // Navigate to the individual thread page immediately (before streaming completes)
    if (threadId && !initialThread && onThreadCreated) {
      onThreadCreated(threadId);
    }
  }, [threadId, initialThread, onThreadCreated]);

  // Handle error state - mark the last user message as failed
  useEffect(() => {
    // When an error occurs, mark the last user message as failed
    // Only mark as failed if:
    // 1. Streaming is complete (!isStreaming)
    // 2. We have an error
    // 3. We have a lastUserMessageId to mark as failed
    // Note: We don't include conversationHistory in deps to avoid unnecessary re-runs
    // The lastUserMessageId.current ref ensures we target the correct message
    if (!isStreaming && error && lastUserMessageId.current) {
      // Mark the last user message as failed using the tracked message ID
      setConversationHistory((prev) =>
        prev.map((msg) =>
          msg.id === lastUserMessageId.current && !msg.isFailed
            ? { ...msg, isFailed: true }
            : msg
        )
      );
    }
  }, [isStreaming, error]);

  // Add assistant response to conversation when streaming completes
  useEffect(() => {
    // When streaming completes and we have a response, add it to conversation history
    // Only add if:
    // 1. Streaming is complete (!isStreaming)
    // 2. We have a response
    // 3. We have a threadId (streaming completed successfully)
    // 4. We haven't already added this exact response (check by content hash)
    // 5. The last message is from the user (we haven't added assistant response yet)
    if (
      !isStreaming &&
      response &&
      threadId &&
      conversationHistory.length > 0 &&
      conversationHistory[conversationHistory.length - 1].role === 'user'
    ) {
      // Create a hash of the response to detect duplicates
      // In multi-turn conversations, each response will be different
      // Use full response for robust duplicate detection
      const responseHash = `${threadId}-${response}`;

      if (addedResponseHash.current !== responseHash) {
        setConversationHistory((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
            citations,
            confidenceScore: confidenceScore || undefined,
          },
        ]);
        // Mark this response as added to prevent duplicates
        addedResponseHash.current = responseHash;
        // Clear the failed state tracking since we succeeded
        lastUserMessageId.current = null;
      }
    }
  }, [
    isStreaming,
    response,
    threadId,
    conversationHistory,
    citations,
    confidenceScore,
  ]);

  // Handle new message submission
  const handleSubmitMessage = useCallback(
    async (message: string) => {
      // Notify parent that a message was submitted
      onMessageSubmit?.();

      // Generate unique ID for this user message using crypto.randomUUID()
      // This ensures truly unique IDs even with rapid submissions
      const messageId = `user-${crypto.randomUUID()}`;
      lastUserMessageId.current = messageId;

      // Add user message to conversation
      setConversationHistory((prev) => [
        ...prev,
        {
          id: messageId,
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
      ]);

      try {
        // Start streaming response
        await startStreaming({
          query: message,
          threadId: initialThread?.id, // Use initialThread for multi-turn conversations
          organizationId: currentOrganization?.id,
          spaceId,
          saveToDb: true, // Save to database for history
        });
        // Note: Assistant response will be added by useEffect when streaming completes
      } catch (err) {
        console.error('Message streaming failed:', err);
        // Error handling happens in useEffect based on error state from useStreamingQuery
      }
    },
    [
      onMessageSubmit,
      initialThread?.id,
      currentOrganization?.id,
      spaceId,
      startStreaming,
    ]
  );

  // Handle retry on error - use the retry method from useStreamingQuery
  const handleRetry = useCallback(async () => {
    // Store the message ID before clearing it (needed for clearing failed state)
    const messageId = lastUserMessageId.current;

    // Clear failed state on the last user message before retrying
    if (messageId) {
      setConversationHistory((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isFailed: false } : msg
        )
      );
    }

    // Reset the ref so subsequent failures can be properly tracked
    // This prevents the race condition where retry fails but the message isn't marked
    lastUserMessageId.current = messageId;

    try {
      await retry();
      // Note: Assistant response will be added by useEffect when streaming completes
    } catch (err) {
      console.error('Retry failed:', err);
      // Error handling happens in useEffect based on error state from useStreamingQuery
    }
  }, [retry]);

  // Determine if we should show the active streaming response
  // Show it while streaming OR after completion but before adding to history
  const lastMessageIsFromUser =
    conversationHistory.length > 0 &&
    conversationHistory[conversationHistory.length - 1].role === 'user';
  const shouldShowActiveResponse =
    isStreaming || (response && lastMessageIsFromUser && !error);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Container with Scroll Button - Constrained width matching input */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-0 relative">
        {/* Conversation History - Constrained width container */}
        {conversationHistory.length > 0 && (
          <div className="max-w-3xl mx-auto">
            {conversationHistory.map((message) => (
              <div key={message.id}>
                <ThreadMessage
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  confidenceScore={message.confidenceScore}
                  isFailed={message.isFailed}
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
              <ThreadResponse
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
        {/* Scroll to Bottom Button - Hex design with auto-hide */}
        {showScrollButton && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button
              onClick={handleScrollToBottom}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
              size="sm"
              className="rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 px-3 py-2 h-9"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Input Area - Empty state sits naturally above input */}
      <div className="flex-shrink-0 bg-white">
        {/* Empty State - Shows above input when no messages */}
        {conversationHistory.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center py-12">
            <ThreadsEmptyState />
          </div>
        )}

        {/* Thread Input (Fixed at Bottom) - Same width as messages */}
        <ThreadInput onSubmit={handleSubmitMessage} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
