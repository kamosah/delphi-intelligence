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

export interface TipTapEditorProps {
  /**
   * Additional CSS classes for the editor container
   */
  className?: string;

  /**
   * Data test ID for testing
   */
  'data-testid'?: string;

  /**
   * TipTap editor instance to use
   */
  editor: Editor | null;
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
 * <TipTapEditor editor={editor} />
 * ```
 */
export function TipTapEditor({
  className,
  editor,
  'data-testid': dataTestId,
}: TipTapEditorProps) {
  return (
    <div
      className={cn(
        // Base styles
        'relative w-full rounded-lg border transition-colors',

        // Hex aesthetic: White background with subtle gray border and blue focus ring
        'bg-white border-gray-200',
        'focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10',

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
