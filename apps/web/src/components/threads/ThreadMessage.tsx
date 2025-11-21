'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownContent } from '../common/MarkdownContent';

interface ThreadMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isFailed?: boolean;
  className?: string;
}

interface UserMessageProps {
  content: string;
  isFailed?: boolean;
  className?: string;
}

interface AIMessageProps {
  content: string;
  className?: string;
}

/**
 * UserMessage - Right-aligned user message with subtle bubble
 */
function UserMessage({ content, isFailed, className }: UserMessageProps) {
  return (
    <div className={cn('flex justify-end px-4 py-3', className)}>
      <div className="max-w-3xl">
        <div
          className={cn(
            'text-sm whitespace-pre-wrap break-words rounded-md px-3 py-2',
            isFailed
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-gray-100 text-gray-900'
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
 * AIMessage - Simple text-only AI response with markdown
 */
function AIMessage({ content, className }: AIMessageProps) {
  return (
    <div className={cn('px-4 py-3', className)}>
      <div className="max-w-3xl text-gray-900 prose prose-sm">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}

/**
 * ThreadMessage component displays a single message in the conversation.
 *
 * Simplified for Hex aesthetic:
 * - User messages: Right-aligned with subtle gray bubble (bg-gray-100, rounded-md, text-gray-900)
 * - AI messages: Left-aligned text-only with markdown (gray-900)
 * - No timestamps, no confidence scores, no role labels
 * - Failed message state with visual indicator (red bubble for user messages)
 * - Minimal, distraction-free conversation flow
 *
 * @example
 * <ThreadMessage
 *   role="user"
 *   content="What are the key risks?"
 * />
 */
export function ThreadMessage({
  role,
  content,
  isFailed,
  className,
}: ThreadMessageProps) {
  if (role === 'user') {
    return (
      <UserMessage
        content={content}
        isFailed={isFailed}
        className={className}
      />
    );
  }

  return <AIMessage content={content} className={className} />;
}
