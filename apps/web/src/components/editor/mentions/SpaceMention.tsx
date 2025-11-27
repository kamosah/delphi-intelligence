/**
 * Space Mention Node Component
 *
 * Renders a #space mention as a purple badge in the TipTap editor.
 * Follows Hex design aesthetic with rounded corners and colored background.
 *
 * The badge is read-only and displays:
 * - Hash icon
 * - Space name
 * - Purple background (matches Hex color palette)
 */

'use client';

import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Hash } from 'lucide-react';
import { cn } from '@olympus/ui';

/**
 * Renders a space mention badge
 *
 * @example
 * // In editor content: #sales-team
 * // Renders as: [# Sales Team] (purple badge)
 */
export function SpaceMention({ node }: NodeViewProps) {
  const { label, iconColor } = node.attrs as {
    id: string;
    label: string;
    iconColor?: string | null;
  };

  return (
    <NodeViewWrapper className="inline-block">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
          'bg-purple-100 text-purple-700',
          'text-sm font-medium',
          'transition-colors hover:bg-purple-200'
        )}
        data-mention-type="space"
        data-mention-id={node.attrs.id}
      >
        {/* Hash icon with optional custom color */}
        <Hash
          className="h-3.5 w-3.5"
          style={iconColor ? { color: iconColor } : undefined}
        />

        {/* Space name */}
        <span>{label}</span>
      </span>
    </NodeViewWrapper>
  );
}

SpaceMention.displayName = 'SpaceMention';
