/**
 * Custom hook for TipTap editor initialization and management
 *
 * Following ADR-003: Mentions Implementation with TipTap
 * Provides editor instance with configured extensions and event handlers
 */

import { useEffect, useState } from 'react';
import { useEditor, type Editor } from '@tiptap/react';
import {
  getEditorExtensions,
  type EditorExtensionsConfig,
} from '@/lib/tiptap/extensions';

export interface UseTipTapEditorOptions extends EditorExtensionsConfig {
  /**
   * Initial content of the editor (plain text or HTML)
   */
  content?: string;

  /**
   * Callback when editor content changes
   */
  onUpdate?: (content: string) => void;

  /**
   * Callback when user presses Enter (to submit)
   * Receives the text content and mentioned space IDs
   */
  onSubmit?: (content: string, mentionedSpaceIds?: string[]) => void;

  /**
   * Whether the editor is disabled
   */
  disabled?: boolean;

  /**
   * Whether to auto-focus the editor on mount
   */
  autofocus?: boolean;
}

/**
 * Custom hook for initializing and managing a TipTap editor instance
 *
 * @param options - Configuration options for the editor
 * @returns TipTap editor instance
 *
 * @example
 * ```tsx
 * const editor = useTipTapEditor({
 *   placeholder: 'Ask a question...',
 *   onSubmit: (content) => console.log('Submitted:', content),
 *   onUpdate: (content) => console.log('Content:', content),
 * });
 * ```
 */
export type UseTipTapEditorReturn = {
  editor: Editor | null;
  isReady: boolean;
  getEditorText: () => string;
  clearEditorContent: () => void;
  setEditorContent: (content: string) => void;
  focusEditor: () => void;
  /**
   * Extract mentioned space IDs from editor content
   * Parses editor JSON to find all spaceMention nodes
   */
  getMentionedSpaceIds: () => string[];
};

export function useTipTapEditor(
  options: UseTipTapEditorOptions = {}
): UseTipTapEditorReturn {
  const {
    content = '',
    onUpdate,
    onSubmit,
    disabled = false,
    autofocus = false,
    placeholder,
    fetchSpaces,
  } = options;
  const [isReady, setIsReady] = useState(false);

  const editor = useEditor(
    {
      extensions: getEditorExtensions({ placeholder, fetchSpaces }),
      content,
      autofocus,
      editable: !disabled,
      /**
       * Disable immediate rendering to prevent hydration mismatches in Next.js SSR.
       * Without this, the editor tries to render during SSR but the content structure
       * may differ between server and client, causing React hydration errors.
       * This ensures the editor only renders client-side after hydration completes.
       */
      immediatelyRender: false,

      // Handle content updates
      // Note: This callback is optional and triggers on ALL content changes,
      // including programmatic clearing. For state management, prefer using
      // useEditorIsEmpty/useEditorText hooks which sync with editor state directly.
      onUpdate: ({ editor }) => {
        const text = editor.getText().trim();
        onUpdate?.(text);
      },

      // Custom keyboard shortcuts
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none p-4',
        },
        handleKeyDown: (view, event) => {
          const { state } = view;
          const text = state.doc.textContent.trim();
          // Handle Enter key for submission (without Shift)
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (text) {
              // Extract mentioned space IDs before clearing
              const mentionedIds: string[] = [];
              state.doc.descendants((node) => {
                if (node.type.name === 'spaceMention' && node.attrs.id) {
                  mentionedIds.push(node.attrs.id);
                }
              });

              onSubmit?.(
                text,
                mentionedIds.length > 0 ? mentionedIds : undefined
              );
              // Clear content using the live view
              // This triggers onUpdate('') but that's fine - consumers should use
              // useEditorIsEmpty hook for state instead of relying on callbacks
              view.dispatch(state.tr.delete(0, state.doc.content.size));
            }
            return true;
          }

          // Shift+Enter creates a hard break (new line)
          // This is handled by the HardBreak extension
          return false;
        },
      },
    },
    // Empty dependency array - editor created once on mount
    // Placeholder is part of extension config and doesn't need to trigger recreation
    [onUpdate, onSubmit]
  );

  const getEditorText = (): string => {
    return editor?.getText().trim() || '';
  };

  const clearEditorContent = (): void => {
    editor?.commands.clearContent();
  };

  const setEditorContent = (content: string): void => {
    editor?.commands.setContent(content);
  };

  const focusEditor = (): void => {
    editor?.commands.focus();
  };

  /**
   * Extract all mentioned space IDs from editor content
   *
   * Traverses the editor's JSON structure to find spaceMention nodes
   * and collects their IDs.
   *
   * @returns Array of space IDs that were mentioned
   */
  const getMentionedSpaceIds = (): string[] => {
    if (!editor) return [];

    const mentionedIds: string[] = [];
    const json = editor.getJSON();

    // Traverse the editor content to find spaceMention nodes
    const traverse = (node: {
      type?: string;
      attrs?: { id?: string };
      content?: unknown[];
    }) => {
      if (node.type === 'spaceMention' && node.attrs?.id) {
        mentionedIds.push(node.attrs.id);
      }

      // Recursively traverse child nodes
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);

    // Return unique IDs (in case of duplicates)
    return Array.from(new Set(mentionedIds));
  };

  // Set isReady and update editable state when editor or disabled changes
  useEffect(() => {
    if (editor) {
      setIsReady(true);
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return {
    editor,
    isReady,
    getEditorText,
    clearEditorContent,
    setEditorContent,
    focusEditor,
    getMentionedSpaceIds,
  };
}
