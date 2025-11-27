/**
 * Space Mention Autocomplete List Component
 *
 * Displays a dropdown list of space suggestions when user types '#' in the editor.
 * Follows Hex design aesthetic with keyboard navigation and fuzzy search.
 *
 * Features:
 * - Arrow key navigation (up/down)
 * - Enter to select
 * - Escape to close
 * - Visual highlight on hover/focus
 * - Empty state for no results
 */

'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type KeyboardEvent,
} from 'react';
import type { SuggestionProps } from '@tiptap/suggestion';
import { Hash } from 'lucide-react';
import { cn } from '@olympus/ui';
import type { SpaceMentionItem } from '@/lib/tiptap/mentions/space-mention-config';

export type SpaceMentionListProps = SuggestionProps<SpaceMentionItem>;

export interface SpaceMentionListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Autocomplete dropdown for space mentions
 *
 * @example
 * // Used internally by TipTap suggestion plugin
 * <SpaceMentionList items={spaces} command={selectSpace} />
 */
export const SpaceMentionList = forwardRef<
  SpaceMentionListRef,
  SpaceMentionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  // Expose keyboard handler to parent (TipTap suggestion)
  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) =>
          prev === 0 ? props.items.length - 1 : prev - 1
        );
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) =>
          prev === props.items.length - 1 ? 0 : prev + 1
        );
        return true;
      }

      if (event.key === 'Enter') {
        const item = props.items[selectedIndex];
        if (item) {
          selectItem(item);
          return true;
        }
        return false;
      }

      return false;
    },
  }));

  const selectItem = (item: SpaceMentionItem) => {
    props.command({
      id: item.id,
      label: item.name,
      iconColor: item.iconColor,
    });
  };

  // Empty state
  if (props.items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
        <p className="text-sm text-gray-500">No spaces found</p>
      </div>
    );
  }

  return (
    <div className="flex max-h-[280px] min-w-[240px] flex-col overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(item)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={cn(
            'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors',
            'hover:bg-gray-50',
            'focus:bg-gray-50 focus:outline-none',
            selectedIndex === index && 'bg-gray-50'
          )}
        >
          {/* Icon (colored square with hash) */}
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{
              backgroundColor: item.iconColor || '#8B5CF6', // Default purple
            }}
          >
            <Hash className="h-4 w-4 text-white" />
          </div>

          {/* Space name */}
          <span className="flex-1 truncate text-sm font-medium text-gray-900">
            {item.name}
          </span>
        </button>
      ))}
    </div>
  );
});

SpaceMentionList.displayName = 'SpaceMentionList';
