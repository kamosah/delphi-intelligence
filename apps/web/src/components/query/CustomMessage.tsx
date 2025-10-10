'use client';

import { cn } from '@/lib/utils';
import { MessagePrimitive, useMessage } from '@assistant-ui/react';
import { Avatar, AvatarFallback } from '@olympus/ui';
import { Bot, User } from 'lucide-react';

/**
 * CustomMessage component using Assistant-UI primitives
 * This component renders individual messages in the chat interface
 * with proper styling for both user and assistant messages.
 */
export function CustomMessage() {
  const message = useMessage();
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex gap-3 p-4 group', isUser && 'justify-end')}>
      {/* Avatar - Only shown for assistant messages */}
      {isAssistant && (
        <Avatar className="h-8 w-8 border-2 border-agent-primary shrink-0">
          <AvatarFallback className="bg-agent-primary/10">
            <Bot className="h-4 w-4 text-agent-primary" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content Wrapper */}
      <div
        className={cn('flex flex-col gap-2 max-w-[80%]', isUser && 'items-end')}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-3 shadow-sm',
            isUser && 'bg-primary text-primary-foreground',
            isAssistant && 'bg-muted',
            'prose prose-sm dark:prose-invert max-w-none',
            'transition-colors duration-200'
          )}
        >
          <MessagePrimitive.Content />
        </div>

        {/* Metadata (timestamp, etc.) */}
        <div className="text-xs text-muted-foreground px-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>

      {/* User Avatar - Only shown for user messages */}
      {isUser && (
        <Avatar className="h-8 w-8 border-2 border-primary shrink-0">
          <AvatarFallback className="bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
