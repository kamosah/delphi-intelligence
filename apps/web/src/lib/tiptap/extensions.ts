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
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Placeholder from '@tiptap/extension-placeholder';
// import Mention from '@tiptap/extension-mention'; // Phase 2: Activate for mentions

export interface EditorExtensionsConfig {
  placeholder?: string;
  // Phase 2: Add mention configurations
  // mentions?: {
  //   users: boolean;
  //   databases: boolean;
  //   spaces: boolean;
  // };
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
  const { placeholder = 'Ask a question...' } = config;

  return [
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

    // Phase 2: Add mention extensions here
    // Mention.configure({
    //   HTMLAttributes: {
    //     class: 'mention',
    //   },
    //   suggestion: {
    //     // Suggestion configuration will be implemented in Phase 2
    //   },
    // }),
  ];
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
