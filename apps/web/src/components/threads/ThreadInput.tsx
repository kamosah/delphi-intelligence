'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Square } from 'lucide-react';
import { Button } from '@olympus/ui';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { useEditorIsEmpty } from '@/hooks/useEditorState';
import { useTipTapEditor } from '../../hooks/useTipTapEditor';
import { StreamingContainer } from './StreamingContainer';

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
 * - Status indicator showing "Searching documents..." or "Working..." during streaming
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

  // Only disable send button when input is empty or disabled.
  // Submission is also prevented during streaming by the handler functions for safety.
  const canSubmit = !isEmpty && !disabled;

  // Handle stop button click
  const handleStopClick = useCallback(() => {
    if (onStopStreaming) {
      onStopStreaming();
    }
  }, [onStopStreaming]);

  return (
    <div className={`${className || ''} pb-4`}>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
        {/* Status indicator during streaming - Above input */}
        <StreamingContainer
          isStreaming={isStreaming}
          statusText={hasResponse ? 'Working...' : 'Searching documents...'}
        >
          <motion.div
            className="relative rounded-md overflow-hidden"
            animate={
              isStreaming
                ? {
                    boxShadow: [
                      '0 0 0 1px rgba(96, 165, 250, 0.5)',
                      '0 0 0 1px rgba(147, 51, 234, 0.5)',
                      '0 0 0 1px rgba(96, 165, 250, 0.5)',
                    ],
                  }
                : {
                    boxShadow: '0 0 0 0px transparent',
                  }
            }
            transition={{
              duration: 2,
              repeat: isStreaming ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            <TipTapEditor
              className="pr-12 rounded-md"
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
        </StreamingContainer>
      </div>
    </div>
  );
}
