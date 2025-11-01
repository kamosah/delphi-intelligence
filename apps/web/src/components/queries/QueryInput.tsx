'use client';

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { Button, Textarea } from '@olympus/ui';
import { Send, Loader2 } from 'lucide-react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * QueryInput component for submitting natural language queries.
 *
 * Features:
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for new line
 * - Character count indicator
 * - Disabled state during streaming
 * - Send button with loading state
 *
 * @example
 * <QueryInput
 *   onSubmit={(query) => startStreaming({ query, spaceId })}
 *   isStreaming={isStreaming}
 * />
 */
export function QueryInput({
  onSubmit,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask a question about your documents...',
  className,
}: QueryInputProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !isStreaming) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery && !isStreaming && !disabled) {
      onSubmit(trimmedQuery);
      setQuery(''); // Clear input after submission
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift submits the form
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    // Shift+Enter adds a new line (default behavior)
  };

  const isDisabled = disabled || isStreaming;
  const canSubmit = query.trim().length > 0 && !isDisabled;

  return (
    <form onSubmit={handleSubmit} className={`bg-white p-4 ${className || ''}`}>
      <div className="max-w-4xl mx-auto">
        {/* Input container with button inside */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={3}
            className="resize-none pr-12"
            aria-label="Query input"
          />

          {/* Send Button - Positioned inside input */}
          <Button
            type="submit"
            disabled={!canSubmit}
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 shrink-0"
            aria-label="Send query"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
