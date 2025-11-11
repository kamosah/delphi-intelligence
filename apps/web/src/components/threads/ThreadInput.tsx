'use client';

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  Textarea,
} from '@olympus/ui';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';

interface ThreadInputFormData {
  query: string;
}

interface ThreadInputProps {
  onSubmit: (query: string) => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * ThreadInput component for submitting natural language queries in threads.
 *
 * Features:
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for new line
 * - Disabled state during streaming
 * - Send button with loading state
 * - Responsive width with padding on mobile (px-4) and tablet (sm:px-6)
 * - Constrained max-width (max-w-3xl) matching message layout on desktop
 * - React Hook Form integration with Shadcn Form components
 *
 * @example
 * <ThreadInput
 *   onSubmit={(query) => startStreaming({ query, spaceId })}
 *   isStreaming={isStreaming}
 * />
 */
export function ThreadInput({
  onSubmit,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask a question about your documents...',
  className,
}: ThreadInputProps) {
  const form = useForm<ThreadInputFormData>({
    defaultValues: { query: '' },
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const query = form.watch('query');

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !isStreaming) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  // Handle form submission
  const onSubmitForm = (data: ThreadInputFormData) => {
    const trimmedQuery = data.query.trim();

    if (trimmedQuery && !isStreaming && !disabled) {
      onSubmit(trimmedQuery);
      form.reset(); // Clear input after submission
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift submits the form
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmitForm)();
    }
    // Shift+Enter adds a new line (default behavior)
  };

  const isDisabled = disabled || isStreaming;
  const canSubmit = query?.trim().length > 0 && !isDisabled;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmitForm)}
        className={`${className || ''}`}
      >
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
          {/* Input container with button inside */}
          <div className="relative">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      ref={textareaRef}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      disabled={isDisabled}
                      rows={3}
                      className="resize-none pr-12"
                      aria-label="Query input"
                    />
                  </FormControl>
                </FormItem>
              )}
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
    </Form>
  );
}
