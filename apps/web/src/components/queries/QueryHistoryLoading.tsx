'use client';

import { Skeleton } from '@olympus/ui';
import { History, ChevronLeft } from 'lucide-react';

interface QueryHistoryLoadingProps {
  onCollapse: () => void;
  className?: string;
}

/**
 * QueryHistoryLoading displays a loading skeleton state for the query history sidebar.
 *
 * Shows placeholder skeletons while query history is being fetched.
 */
export function QueryHistoryLoading({
  onCollapse,
  className,
}: QueryHistoryLoadingProps) {
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
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
