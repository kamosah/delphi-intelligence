'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { MarkdownContent } from '../common/MarkdownContent';

interface ThreadMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date | string;
  confidenceScore?: number;
  isFailed?: boolean;
  className?: string;
}

interface MessageHeaderProps {
  role: 'user' | 'assistant';
  timestamp?: string;
  confidenceScore?: number;
}

interface UserMessageProps {
  content: string;
  timestamp?: string;
  isFailed?: boolean;
  className?: string;
}

interface AIMessageProps {
  content: string;
  timestamp?: string;
  confidenceScore?: number;
  className?: string;
}

/**
 * MessageHeader - Header with role, timestamp, and optional confidence score
 */
function MessageHeader({
  role,
  timestamp,
  confidenceScore,
}: MessageHeaderProps) {
  const isUser = role === 'user';

  return (
    <div className="flex items-center gap-2 mb-1">
      <span
        className={cn(
          'text-sm font-semibold',
          isUser ? 'text-blue-900' : 'text-purple-900'
        )}
      >
        {isUser ? 'You' : 'Athena AI'}
      </span>
      {timestamp && <span className="text-xs text-gray-500">{timestamp}</span>}
      {!isUser && confidenceScore !== undefined && (
        <span className="text-xs font-medium text-green-600">
          {Math.round(confidenceScore * 100)}% confidence
        </span>
      )}
    </div>
  );
}

/**
 * UserMessage - Right-aligned message bubble for user messages
 */
function UserMessage({
  content,
  timestamp,
  isFailed,
  className,
}: UserMessageProps) {
  return (
    <div className={cn('flex justify-end px-4 py-4', className)}>
      <div
        className={cn(
          'max-w-3xl rounded-lg px-4 py-3',
          isFailed ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
        )}
      >
        <MessageHeader role="user" timestamp={timestamp} />
        <div
          className={cn(
            'text-sm whitespace-pre-wrap break-words',
            isFailed ? 'text-red-900' : 'text-gray-800'
          )}
        >
          {content}
        </div>
        {isFailed && (
          <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span>Message failed to send</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AIMessage - Left-aligned transparent message for AI responses
 */
function AIMessage({
  content,
  timestamp,
  confidenceScore,
  className,
}: AIMessageProps) {
  return (
    <div className={cn('flex justify-start px-4 py-4', className)}>
      <div className="max-w-3xl">
        <MessageHeader
          role="assistant"
          timestamp={timestamp}
          confidenceScore={confidenceScore}
        />
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}

/**
 * ThreadMessage component displays a single message in the conversation.
 *
 * Features:
 * - User messages: Right-aligned with light gray bubble (or red if failed)
 * - AI messages: Left-aligned, transparent (no bubble)
 * - Timestamp display
 * - Confidence score for assistant messages
 * - Markdown rendering for AI messages
 * - Clean interface without avatar icons
 * - Failed message state with visual indicator
 *
 * @example
 * <ThreadMessage
 *   role="user"
 *   content="What are the key risks?"
 *   timestamp={new Date()}
 * />
 */
export function ThreadMessage({
  role,
  content,
  timestamp,
  confidenceScore,
  isFailed,
  className,
}: ThreadMessageProps) {
  // Format timestamp
  const formattedTime = timestamp
    ? format(new Date(timestamp), 'h:mm a')
    : undefined;

  if (role === 'user') {
    return (
      <UserMessage
        content={content}
        timestamp={formattedTime}
        isFailed={isFailed}
        className={className}
      />
    );
  }

  return (
    <AIMessage
      content={content}
      timestamp={formattedTime}
      confidenceScore={confidenceScore}
      className={className}
    />
  );
}
