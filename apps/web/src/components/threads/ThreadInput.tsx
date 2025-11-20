'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Square } from 'lucide-react';
import { Button } from '@olympus/ui';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { useEditorIsEmpty } from '@/hooks/useEditorState';
import { useTipTapEditor } from '../../hooks/useTipTapEditor';

interface ThreadInputProps {
  className?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  hasResponse?: boolean;
  onSubmit: (message: string) => void;
  onStopStreaming?: () => void;
  placeholder?: string;
}

/**
 * ThreadInput component for submitting messages in threads.
 *
 * Features:
 * - TipTap rich text editor with mentions support (Phase 2)
 * - Enter to send, Shift+Enter for new line
 * - Stop button during streaming with pulse animation
 * - Animated gradient border during streaming (Framer Motion)
 * - Status indicator showing "Claude is thinking..." during streaming
 * - Input disabled and grayed out during streaming
 * - Responsive width with padding on mobile (px-4) and tablet (sm:px-6)
 * - Constrained max-width (max-w-3xl) matching message layout on desktop
 * - Uses useSyncExternalStore to read editor.isEmpty directly (no separate state)
 *
 * @example
 * <ThreadInput
 *   onSubmit={(message) => handleSubmit(message)}
 *   onStopStreaming={stopStreaming}
 *   isStreaming={isStreaming}
 * />
 */
export function ThreadInput({
  onSubmit,
  onStopStreaming,
  isStreaming = false,
  hasResponse = false,
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
        // Note: Editor is cleared by the hook's Enter keydown handler
        // The send button uses clearEditorContent() helper
        // useEditorIsEmpty will automatically re-render when editor clears via either method
      }
    },
    [onSubmit, isStreaming, disabled]
  );

  const { editor, isReady, clearEditorContent, getEditorText } =
    useTipTapEditor({
      placeholder,
      onSubmit: handleEditorSubmit,
      disabled: disabled || isStreaming, // Disable input during streaming
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

  // Only disable send button when empty or disabled (not during streaming - use stop button instead)
  const canSubmit = !isEmpty && !disabled;

  // Handle stop button click
  const handleStopClick = useCallback(() => {
    if (onStopStreaming) {
      onStopStreaming();
    }
  }, [onStopStreaming]);

  return (
    <div className={`${className || ''} py-4`}>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
        {/* Status indicator during streaming - Above input */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-sm text-gray-600 pb-2"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{hasResponse ? 'Working...' : 'Searching documents...'}</span>
          </motion.div>
        )}

        {/* Input container with animated border during streaming */}
        <motion.div
          className="relative rounded-lg"
          animate={
            isStreaming
              ? {
                  boxShadow: [
                    '0 0 0 2px rgba(96, 165, 250, 0.5)',
                    '0 0 0 2px rgba(147, 51, 234, 0.5)',
                    '0 0 0 2px rgba(96, 165, 250, 0.5)',
                  ],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <TipTapEditor
            className="pr-12"
            data-testid="thread-input-editor"
            editor={editor}
          />

          {/* Send/Stop Button - Positioned inside input */}
          {isReady && (
            <Button
              onClick={isStreaming ? handleStopClick : handleSendClick}
              disabled={isStreaming ? false : !canSubmit}
              size="icon"
              className={`absolute bottom-2 right-2 h-8 w-8 shrink-0 ${
                isStreaming
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : canSubmit
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              aria-label={isStreaming ? 'Stop generating' : 'Send message'}
            >
              {isStreaming ? (
                <Square className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
