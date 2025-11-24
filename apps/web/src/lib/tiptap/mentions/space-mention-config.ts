/**
 * Space Mention Configuration for TipTap
 *
 * Configures the #space mention behavior in the thread input editor.
 * Uses TipTap's suggestion plugin to provide autocomplete functionality.
 *
 * @see https://tiptap.dev/docs/editor/extensions/functionality/mention
 */

import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { SpaceMentionList } from '@/components/editor/mentions/SpaceMentionList';

export interface SpaceMentionItem {
  id: string;
  name: string;
  iconColor?: string | null;
}

/**
 * TipTap suggestion configuration for #space mentions
 *
 * Behavior:
 * - Trigger: '#' character
 * - Autocomplete: Show dropdown with spaces filtered by query
 * - Keyboard: Arrow keys navigate, Enter selects, Escape closes
 * - Visual: Purple badge with hash icon (Hex aesthetic)
 */
export const spaceMentionSuggestion: Omit<
  SuggestionOptions<SpaceMentionItem>,
  'editor'
> = {
  // Use '#' as trigger character for space mentions
  char: '#',

  // Allow spaces in search query (e.g., "#sales team" matches "Sales Team")
  allowSpaces: true,

  // Function to fetch and filter space items
  items: async (): Promise<SpaceMentionItem[]> => {
    // This will be dynamically injected by the editor hook
    // to avoid circular dependencies with React hooks
    return [];
  },

  // Render the autocomplete dropdown
  render: () => {
    let component: ReactRenderer<unknown, SuggestionProps<SpaceMentionItem>>;
    let popup: TippyInstance[];

    return {
      onStart: (props) => {
        component = new ReactRenderer(SpaceMentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          // Hex aesthetic: rounded corners, shadow
          theme: 'light-border',
          maxWidth: 360,
          offset: [0, 8],
        });
      },

      onUpdate(props) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0]?.hide();
          return true;
        }

        // Forward arrow keys and enter to the component
        // @ts-expect-error - component.ref is not typed but exists
        return component.ref?.onKeyDown(props.event) ?? false;
      },

      onExit() {
        popup[0]?.destroy();
        component.destroy();
      },
    };
  },
};
