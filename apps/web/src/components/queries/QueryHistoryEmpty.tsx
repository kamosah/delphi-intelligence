'use client';

import { MessageSquare, History, ChevronLeft } from 'lucide-react';

interface QueryHistoryEmptyProps {
  onCollapse: () => void;
  className?: string;
}

/**
 * QueryHistoryEmpty displays an empty state for the query history sidebar.
 *
 * Shows when there are no queries in the history yet.
 */
export function QueryHistoryEmpty({
  onCollapse,
  className,
}: QueryHistoryEmptyProps) {
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
      <div className="text-center py-12 px-4">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600 font-medium">No queries yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Start by asking a question below
        </p>
      </div>
    </div>
  );
}
