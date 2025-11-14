/**
 * Hook for subscribing to TipTap editor state changes
 *
 * Uses React's useSyncExternalStore to properly sync external TipTap state
 * with React's rendering lifecycle. This eliminates the need for useState
 * to track editor content, as we can read directly from editor.isEmpty.
 *
 * @see https://react.dev/reference/react/useSyncExternalStore
 */

import type { Editor } from '@tiptap/react';
import { useSyncExternalStore } from 'react';

/**
 * Subscribe to TipTap editor state changes and read editor.isEmpty
 *
 * This hook ensures React re-renders when editor content changes,
 * allowing us to read live values from editor properties.
 *
 * @param editor - TipTap editor instance (can be null during initialization)
 * @returns Current isEmpty state (true if editor is empty or null)
 *
 * @example
 * ```tsx
 * const editor = useTipTapEditor({ ... });
 * const isEmpty = useEditorIsEmpty(editor);
 *
 * // isEmpty is always up-to-date with editor state
 * <Button disabled={isEmpty}>Send</Button>
 * ```
 */
export function useEditorIsEmpty(editor: Editor | null): boolean {
  return useSyncExternalStore(
    // Subscribe function: called when component mounts
    // Returns unsubscribe function
    (callback) => {
      if (!editor) return () => {};

      // Listen to editor updates and notify React
      editor.on('update', callback);

      // Cleanup: remove listener when component unmounts
      return () => {
        editor.off('update', callback);
      };
    },

    // Get snapshot: called during render to read current value
    () => {
      return editor?.isEmpty ?? true;
    },

    // Server snapshot: return default value for SSR
    () => true
  );
}

/**
 * Subscribe to editor state and get text content
 *
 * Similar to useEditorIsEmpty but returns the actual text content.
 * Useful for features that need to read content without maintaining separate state.
 *
 * @param editor - TipTap editor instance (can be null during initialization)
 * @returns Current text content (empty string if editor is null)
 */
export function useEditorText(editor: Editor | null): string {
  return useSyncExternalStore(
    (callback) => {
      if (!editor) return () => {};
      editor.on('update', callback);
      return () => {
        editor.off('update', callback);
      };
    },
    () => {
      return editor?.getText() ?? '';
    },
    () => ''
  );
}

/**
 * Subscribe to editor focus state
 *
 * @param editor - TipTap editor instance (can be null during initialization)
 * @returns Current focus state (false if editor is null)
 */
export function useEditorIsFocused(editor: Editor | null): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (!editor) return () => {};

      // Listen to both focus and blur events
      editor.on('focus', callback);
      editor.on('blur', callback);

      return () => {
        editor.off('focus', callback);
        editor.off('blur', callback);
      };
    },
    () => {
      return editor?.isFocused ?? false;
    },
    () => false
  );
}
