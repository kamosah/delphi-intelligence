'use client';

import { ChevronRight } from 'lucide-react';

interface QueryHistoryCollapsedProps {
  onExpand: () => void;
  className?: string;
}

/**
 * QueryHistoryCollapsed displays a minimal collapsed state for the query history sidebar.
 *
 * Shows only a chevron button to expand the sidebar.
 */
export function QueryHistoryCollapsed({
  onExpand,
  className,
}: QueryHistoryCollapsedProps) {
  return (
    <div className={`border-r border-gray-200 bg-white ${className || ''}`}>
      <button
        onClick={onExpand}
        className="p-3 hover:bg-gray-50 transition-colors w-full"
        title="Expand history"
      >
        <ChevronRight className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
