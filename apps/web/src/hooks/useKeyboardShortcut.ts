import { useEffect, useRef } from 'react';

interface KeyboardShortcutOptions {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
}

/**
 * Hook for registering global keyboard shortcuts
 *
 * The callback is automatically memoized using useRef, so you don't need to wrap it in useCallback.
 *
 * @example
 * // Navigate to threads with ⌘J
 * useKeyboardShortcut({
 *   key: 'j',
 *   metaKey: true,
 *   callback: () => router.push('/threads')
 * });
 *
 * @example
 * // Toggle sidebar with ⌘.
 * useKeyboardShortcut({
 *   key: '.',
 *   metaKey: true,
 *   callback: () => toggleSidebar()
 * });
 *
 * @example
 * // Settings with ⇧⌘,
 * useKeyboardShortcut({
 *   key: ',',
 *   metaKey: true,
 *   shiftKey: true,
 *   callback: () => router.push('/settings')
 * });
 */
export function useKeyboardShortcut({
  key,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  callback,
}: KeyboardShortcutOptions) {
  // Store callback in ref to avoid re-registering listener on every render
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches
      if (event.key !== key) return;

      // Check modifiers
      const metaMatch = metaKey
        ? event.metaKey || event.ctrlKey
        : !event.metaKey && !event.ctrlKey;
      const shiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = altKey ? event.altKey : !event.altKey;

      if (metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callbackRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, metaKey, ctrlKey, shiftKey, altKey]);
}
