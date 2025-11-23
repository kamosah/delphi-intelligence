import { useEffect, useMemo, useRef } from 'react';

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
 * Supports both single and multiple shortcut registration.
 * Automatically prevents shortcuts from firing when user is typing in input fields.
 * Callbacks are automatically memoized using useRef.
 *
 * @example
 * // Single shortcut - Navigate to threads with ⌘J
 * useKeyboardShortcut({
 *   key: 'j',
 *   metaKey: true,
 *   callback: () => router.push('/threads')
 * });
 *
 * @example
 * // Multiple shortcuts - Register several at once
 * useKeyboardShortcut([
 *   { key: 'j', metaKey: true, callback: () => router.push('/threads') },
 *   { key: '.', metaKey: true, callback: () => toggleSidebar() },
 *   { key: ',', metaKey: true, shiftKey: true, callback: () => router.push('/settings') }
 * ]);
 */
export function useKeyboardShortcut(
  options: KeyboardShortcutOptions | KeyboardShortcutOptions[]
) {
  // Normalize to array for consistent handling (memoized to avoid recreating on every render)
  const shortcuts = useMemo(
    () => (Array.isArray(options) ? options : [options]),
    [options]
  );

  // Store callbacks in refs to avoid re-registering listener on every render
  const callbackRefs = useRef<(() => void)[]>([]);

  // Create a stable dependency key for shortcuts configuration
  const shortcutsKey = useMemo(
    () =>
      shortcuts
        .map(
          (s) => `${s.key}-${s.metaKey}-${s.ctrlKey}-${s.shiftKey}-${s.altKey}`
        )
        .join(','),
    [shortcuts]
  );

  // Update refs when callbacks change
  useEffect(() => {
    callbackRefs.current = shortcuts.map((s) => s.callback);
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when user is typing in input fields
      if (event.target instanceof HTMLElement) {
        const isEditable = event.target.isContentEditable;
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          event.target.tagName
        );
        if (isEditable || isInput) return;
      }

      // Check each shortcut for a match
      shortcuts.forEach((shortcut, index) => {
        // Check if the key matches
        if (event.key !== shortcut.key) return;

        // Check modifiers
        const metaMatch = shortcut.metaKey
          ? event.metaKey || event.ctrlKey
          : !event.metaKey && !event.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

        if (metaMatch && shiftMatch && altMatch) {
          event.preventDefault();
          callbackRefs.current[index]?.();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, shortcutsKey]);
}
