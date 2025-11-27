/**
 * Space Mention Item Component
 *
 * Individual item in the space mention autocomplete list.
 * Displays space name with colored icon, supports hover and keyboard selection.
 */

'use client';

import { Hash } from 'lucide-react';
import { cn } from '@olympus/ui';

export interface SpaceMentionItemData {
  id: string;
  name: string;
  iconColor?: string | null;
}

export interface SpaceMentionItemProps {
  item: SpaceMentionItemData;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Single space mention suggestion item
 *
 * @example
 * <SpaceMentionItem
 *   item={{ id: '1', name: 'Design', iconColor: '#8B5CF6' }}
 *   isSelected={false}
 *   onSelect={handleSelect}
 * />
 */
export function SpaceMentionItem({
  item,
  isSelected,
  onSelect,
}: SpaceMentionItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors',
        'hover:bg-gray-50',
        'focus:bg-gray-50 focus:outline-none',
        isSelected && 'bg-gray-50'
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
  );
}
