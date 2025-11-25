/**
 * Space Mention Autocomplete Component
 *
 * Provides #space mention autocomplete using TipTap's SuggestionMenu component.
 * Handles keyboard navigation properly without conflicting with editor shortcuts.
 *
 * Features:
 * - Trigger: '#' character
 * - Built-in keyboard navigation (Arrow keys, Enter, Escape)
 * - No conflicts with editor submit (Enter to select, not submit)
 * - Automatic filtering and sorting
 * - Accessible (ARIA labels, role="listbox")
 */

'use client';

import type { Editor } from '@tiptap/react';
import { SuggestionMenu } from '@/components/tiptap-ui-utils/suggestion-menu';
import type { SuggestionItem } from '@/components/tiptap-ui-utils/suggestion-menu/suggestion-menu-types';
import { filterSuggestionItems } from '@/components/tiptap-ui-utils/suggestion-menu/suggestion-menu-utils';
import { SpaceMentionItem } from './SpaceMentionItem';

export interface SpaceMentionAutocompleteProps {
  /**
   * TipTap editor instance
   */
  editor: Editor | null;

  /**
   * Function to fetch and filter spaces by query
   * Should return spaces that match the search query
   */
  fetchSpaces: (query: string) => Promise<
    Array<{
      id: string;
      name: string;
      iconColor?: string | null;
    }>
  >;

  /**
   * Whether the autocomplete is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Space mention autocomplete with TipTap SuggestionMenu
 *
 * Use this component alongside a TipTap editor to enable #space mentions
 * with proper keyboard navigation that doesn't conflict with editor shortcuts.
 *
 * @example
 * ```tsx
 * <SpaceMentionAutocomplete
 *   editor={editor}
 *   fetchSpaces={async (query) => spaces.filter(...)}
 * />
 * ```
 */
export function SpaceMentionAutocomplete({
  editor,
  fetchSpaces,
  enabled = true,
}: SpaceMentionAutocompleteProps) {
  // Don't render if editor isn't ready or autocomplete is disabled
  if (!editor || !enabled) {
    return null;
  }

  return (
    <SuggestionMenu
      editor={editor}
      char="#"
      pluginKey="spaceMention"
      allowSpaces={true}
      items={async ({ query }): Promise<SuggestionItem[]> => {
        const filteredSpaces = await fetchSpaces(query);

        // Convert spaces to SuggestionItems
        const suggestionItems: SuggestionItem[] = filteredSpaces.map(
          (space) => ({
            title: space.name,
            context: {
              id: space.id,
              iconColor: space.iconColor,
            },
            onSelect: ({ editor, range }) => {
              // Insert space mention node
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  {
                    type: 'spaceMention',
                    attrs: {
                      id: space.id,
                      label: space.name,
                      iconColor: space.iconColor,
                    },
                  },
                  {
                    type: 'text',
                    text: ' ',
                  },
                ])
                .run();
            },
          })
        );

        // Filter items using TipTap's built-in filtering
        return filterSuggestionItems(suggestionItems, query);
      }}
    >
      {({ items, selectedIndex, onSelect }) => {
        // Empty state
        if (items.length === 0) {
          return (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
              <p className="text-sm text-gray-500">No spaces found</p>
            </div>
          );
        }

        // Render space list
        return (
          <div className="flex max-h-[280px] min-w-[240px] flex-col overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {items.map((item, index) => (
              <SpaceMentionItem
                key={item.context.id}
                item={{
                  id: item.context.id,
                  name: item.title,
                  iconColor: item.context.iconColor,
                }}
                isSelected={selectedIndex === index}
                onSelect={() => onSelect(item)}
                onMouseEnter={() => {
                  // Mouse hover updates selection - handled by SuggestionMenu
                }}
              />
            ))}
          </div>
        );
      }}
    </SuggestionMenu>
  );
}
