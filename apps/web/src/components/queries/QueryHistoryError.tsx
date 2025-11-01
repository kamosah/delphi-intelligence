'use client';

import { History, ChevronLeft } from 'lucide-react';

interface QueryHistoryErrorProps {
  onCollapse: () => void;
  className?: string;
}

/**
 * QueryHistoryError displays an error state for the query history sidebar.
 *
 * Shows when query history fails to load.
 */
export function QueryHistoryError({
  onCollapse,
  className,
}: QueryHistoryErrorProps) {
  return (
    <div
      className={`w-64 border-r border-gray-200 bg-white flex flex-col ${className || ''}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
        </div>
        <button onClick={onCollapse} className="hover:bg-gray-50 p-1 rounded">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      <p className="text-sm text-red-600 p-4">Failed to load history</p>
    </div>
  );
}
