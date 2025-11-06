'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { MarkdownContent } from '../common/MarkdownContent';

interface QueryMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date | string;
  confidenceScore?: number;
  className?: string;
}

interface MessageAvatarProps {
  role: 'user' | 'assistant';
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
  className?: string;
}

interface AIMessageProps {
  content: string;
  timestamp?: string;
  confidenceScore?: number;
  className?: string;
}

/**
 * MessageAvatar - Reusable avatar component for user and AI messages
 */
function MessageAvatar({ role, className }: MessageAvatarProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600',
        className
      )}
    >
      {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
    </div>
  );
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
function UserMessage({ content, timestamp, className }: UserMessageProps) {
  return (
    <div className={cn('flex justify-end px-4 py-4', className)}>
      <div className="flex gap-3 max-w-3xl bg-gray-100 rounded-lg px-4 py-3">
        <div className="flex-1 min-w-0">
          <MessageHeader role="user" timestamp={timestamp} />
          <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
        <MessageAvatar role="user" />
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
      <div className="flex gap-3 max-w-3xl">
        <MessageAvatar role="assistant" />
        <div className="flex-1 min-w-0">
          <MessageHeader
            role="assistant"
            timestamp={timestamp}
            confidenceScore={confidenceScore}
          />
          <MarkdownContent content={content} />
        </div>
      </div>
    </div>
  );
}

/**
 * QueryMessage component displays a single message in the conversation.
 *
 * Features:
 * - User messages: Right-aligned with light gray bubble
 * - AI messages: Left-aligned, transparent (no bubble)
 * - Avatar icons
 * - Timestamp display
 * - Confidence score for assistant messages
 * - Markdown rendering for AI messages
 *
 * @example
 * <QueryMessage
 *   role="user"
 *   content="What are the key risks?"
 *   timestamp={new Date()}
 * />
 */
export function QueryMessage({
  role,
  content,
  timestamp,
  confidenceScore,
  className,
}: QueryMessageProps) {
  // Format timestamp
  const formattedTime = timestamp
    ? format(new Date(timestamp), 'h:mm a')
    : undefined;

  if (role === 'user') {
    return (
      <UserMessage
        content={content}
        timestamp={formattedTime}
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
