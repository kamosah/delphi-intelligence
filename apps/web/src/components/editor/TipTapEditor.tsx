/**
 * TipTap Editor Component
 *
 * A rich text editor component with Hex aesthetic styling.
 * Following ADR-003: Mentions Implementation with TipTap
 *
 * Phase 1: Basic editor with text input and keyboard shortcuts
 * Phase 2: Add mention support (@user, @database, #space)
 */

'use client';

import { EditorContent, type Editor } from '@tiptap/react';
import { cn } from '@olympus/ui';
import { useEffect } from 'react';
import { useTipTapEditor } from '@/hooks/useTipTapEditor';

export interface TipTapEditorProps {
  /**
   * Placeholder text shown when editor is empty
   * @default 'Ask a question...'
   */
  placeholder?: string;

  /**
   * Callback when user submits content (presses Enter)
   */
  onSubmit?: (content: string) => void;

  /**
   * Callback when editor content changes
   */
  onChange?: (content: string) => void;

  /**
   * Callback to receive the editor instance for external control
   */
  onEditorReady?: (editor: Editor) => void;

  /**
   * Whether the editor is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether to auto-focus the editor on mount
   * @default false
   */
  autofocus?: boolean;

  /**
   * Additional CSS classes for the editor container
   */
  className?: string;

  /**
   * Data test ID for testing
   */
  'data-testid'?: string;
}

/**
 * TipTap-based rich text editor with Hex aesthetic
 *
 * **Keyboard shortcuts:**
 * - `Enter` - Submit message
 * - `Shift+Enter` - New line
 *
 * @example
 * ```tsx
 * <TipTapEditor
 *   placeholder="Ask a question..."
 *   onSubmit={(content) => console.log('Submitted:', content)}
 *   onChange={(content) => console.log('Content:', content)}
 *   disabled={false}
 * />
 * ```
 */
export function TipTapEditor({
  placeholder = 'Ask a question...',
  onSubmit,
  onChange,
  onEditorReady,
  disabled = false,
  autofocus = false,
  className,
  'data-testid': dataTestId,
}: TipTapEditorProps) {
  const editor = useTipTapEditor({
    placeholder,
    onSubmit,
    onUpdate: onChange,
    disabled,
    autofocus,
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        // Base styles
        'relative w-full rounded-lg border transition-colors',

        // Hex aesthetic: White background with subtle gray border and blue focus ring
        'bg-white border-gray-200',
        'focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10',

        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed bg-gray-50',

        // Custom classes
        className
      )}
      data-testid={dataTestId}
    >
      <EditorContent
        editor={editor}
        className={cn(
          // Editor content styles
          'tiptap-editor',

          // Text styles (Hex aesthetic)
          'text-sm text-gray-900',

          // Larger minimum height to match Hex
          'min-h-[100px]'
        )}
      />
    </div>
  );
}
