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

/**
 * QueryMessage component displays a single message in the conversation.
 *
 * Features:
 * - User and assistant role styling
 * - Avatar icons
 * - Timestamp display
 * - Confidence score for assistant messages
 * - Markdown rendering with syntax highlighting
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
  const isUser = role === 'user';

  // Format timestamp
  const formattedTime = timestamp
    ? format(new Date(timestamp), 'h:mm a')
    : null;

  return (
    <div className={cn('flex gap-3 px-4 py-4', className)}>
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Role + Timestamp + Confidence */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'text-sm font-semibold',
              isUser ? 'text-blue-900' : 'text-purple-900'
            )}
          >
            {isUser ? 'You' : 'Athena AI'}
          </span>
          {formattedTime && (
            <span className="text-xs text-gray-500">{formattedTime}</span>
          )}
          {!isUser && confidenceScore !== undefined && (
            <span className="text-xs font-medium text-green-600">
              {Math.round(confidenceScore * 100)}% confidence
            </span>
          )}
        </div>

        {/* Message Content with Markdown */}
        {isUser ? (
          // User messages: simple text (no markdown)
          <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {content}
          </div>
        ) : (
          // AI messages: render as markdown
          <MarkdownContent content={content} />
        )}
      </div>
    </div>
  );
}
