'use client';

import { useCallback } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@olympus/ui';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { useEditorIsEmpty } from '@/hooks/useEditorState';
import { useTipTapEditor } from '../../hooks/useTipTapEditor';

interface ThreadInputProps {
  className?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  onSubmit: (message: string) => void;
  placeholder?: string;
}

/**
 * ThreadInput component for submitting messages in threads.
 *
 * Features:
 * - TipTap rich text editor with mentions support (Phase 2)
 * - Enter to send, Shift+Enter for new line
 * - Disabled state during streaming
 * - Send button with loading state
 * - Responsive width with padding on mobile (px-4) and tablet (sm:px-6)
 * - Constrained max-width (max-w-3xl) matching message layout on desktop
 * - Uses useSyncExternalStore to read editor.isEmpty directly (no separate state)
 *
 * @example
 * <ThreadInput
 *   onSubmit={(message) => handleSubmit(message)}
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
  /**
   * Memoize callbacks to prevent editor recreation on every render
   * This fixes the infinite loop issue
   */
  const handleEditorSubmit = useCallback(
    (content: string) => {
      const trimmedMessage = content.trim();

      if (trimmedMessage && !isStreaming && !disabled) {
        onSubmit(trimmedMessage);
        // Note: Editor is cleared by hook's Enter keydown handler (useTipTapEditor.ts)
        // The send button below uses a different clearing mechanism (editor.chain().clearContent())
        // useEditorIsEmpty will automatically re-render when editor clears via either method
      }
    },
    [onSubmit, isStreaming, disabled]
  );

  const { editor, isReady, clearEditorContent, getEditorText } =
    useTipTapEditor({
      placeholder,
      onSubmit: handleEditorSubmit,
      disabled,
      autofocus: true,
    });

  /**
   * Subscribe to editor state using useSyncExternalStore
   * This reads editor.isEmpty directly and re-renders when it changes
   */
  const isEmpty = useEditorIsEmpty(editor);

  // Handle send button click
  const handleSendClick = useCallback(() => {
    if (!editor) return;

    const content = getEditorText();

    if (content && !isStreaming && !disabled) {
      onSubmit(content);
      // Clear editor immediately after submission using chain API
      clearEditorContent();
      // useEditorIsEmpty will automatically re-render when editor clears
    }
  }, [
    editor,
    getEditorText,
    isStreaming,
    disabled,
    onSubmit,
    clearEditorContent,
  ]);

  // Only disable button during streaming, keep input enabled
  const canSubmit = !isEmpty && !isStreaming && !disabled;

  return (
    <div className={`${className || ''}`}>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
        {/* Input container with button inside */}
        <div className="relative">
          <TipTapEditor
            className="pr-12"
            data-testid="thread-input-editor"
            editor={editor}
          />

          {/* Send Button - Positioned inside input */}
          {isReady && (
            <Button
              onClick={handleSendClick}
              disabled={!canSubmit}
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 shrink-0"
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
