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
    <form
      onSubmit={handleSubmit}
      className={`border-t border-gray-200 bg-white p-4 ${className || ''}`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 items-end">
          {/* Textarea Input */}
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              rows={3}
              className="resize-none"
              aria-label="Query input"
            />
            {/* Character count hint */}
            {query.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {query.length} characters
                {query.length > 500 &&
                  ' (consider breaking into multiple queries)'}
              </p>
            )}
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            size="lg"
            className="shrink-0"
            aria-label="Send query"
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-2">
          Press{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
            Enter
          </kbd>{' '}
          to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
            Shift + Enter
          </kbd>{' '}
          for new line
        </p>
      </div>
    </form>
  );
}
