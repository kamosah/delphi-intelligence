/**
 * TipTap Editor Extensions Configuration
 *
 * This file centralizes the configuration of TipTap extensions used in the Olympus editor.
 * Following ADR-003: Mentions Implementation with TipTap
 *
 * Phase 1: Basic editor foundation with placeholder (mentions scaffold inactive)
 * Phase 2: Activate mention extensions (@user, @database, #space)
 */

import type { AnyExtension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Mention from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SpaceMention } from '@/components/editor/mentions/SpaceMention';

export interface EditorExtensionsConfig {
  placeholder?: string;
  /**
   * Optional function to fetch space items for #space mentions
   * If provided, enables space mention autocomplete
   */
  fetchSpaces?: (query: string) => Promise<
    Array<{
      id: string;
      name: string;
      iconColor?: string | null;
    }>
  >;
}

/**
 * Get configured TipTap extensions for the editor
 *
 * @param config - Optional configuration for extensions
 * @returns Array of configured TipTap extensions
 */
export function getEditorExtensions(
  config: EditorExtensionsConfig = {}
): AnyExtension[] {
  const { placeholder = 'Ask a question...', fetchSpaces } = config;

  const extensions: AnyExtension[] = [
    // Core document structure
    Document,
    Paragraph,
    Text,

    // Hard break for Shift+Enter
    HardBreak,

    // Placeholder text (styling handled in globals.css via .is-editor-empty)
    Placeholder.configure({
      placeholder,
    }),
  ];

  // Add #space mention node extension
  // Note: Autocomplete/suggestion behavior is handled separately by SuggestionMenu component
  // in ThreadInput to avoid keyboard event conflicts
  if (fetchSpaces) {
    extensions.push(
      Mention.extend({
        name: 'spaceMention',
        // Custom node view for rendering purple badge
        addNodeView() {
          return ReactNodeViewRenderer(SpaceMention);
        },
      }).configure({
        HTMLAttributes: {
          class: 'mention-space',
          'data-type': 'space',
        },
        // No suggestion config - handled by SuggestionMenu component
      })
    );
  }

  return extensions;
}

/**
 * Get editor keyboard shortcuts configuration
 *
 * Defines custom keyboard shortcuts for the editor:
 * - Enter: Submit (default behavior, overridden in editor config)
 * - Shift+Enter: New line (hard break)
 */
export const editorKeyboardShortcuts = {
  Enter: 'submit', // Will be handled by onSubmit callback
  'Shift-Enter': 'hardBreak', // Insert line break
};
