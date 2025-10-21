'use client';

import { useQueryHistory } from '@/hooks/useQueryHistory';
import type { Query } from '@/lib/api/queries-client';
import { ScrollArea, Skeleton } from '@olympus/ui';
import { MessageSquare, History, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface QueryHistoryProps {
  spaceId: string;
  onSelectQuery?: (query: Query) => void;
  className?: string;
}

/**
 * QueryHistory component displays a sidebar with past queries.
 *
 * Features:
 * - List of previous queries with truncated text
 * - Click to load previous query/response
 * - Timestamp for each query
 * - Empty state with helpful message
 * - Loading skeleton
 * - Responsive design (collapsible on mobile)
 *
 * @example
 * <QueryHistory
 *   spaceId="space-123"
 *   onSelectQuery={(query) => console.log(query)}
 * />
 */
export function QueryHistory({
  spaceId,
  onSelectQuery,
  className,
}: QueryHistoryProps) {
  const { queries, isLoading, error } = useQueryHistory(spaceId);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`w-64 border-r border-gray-200 bg-gray-50 p-4 ${className || ''}`}
      >
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`w-64 border-r border-gray-200 bg-gray-50 p-4 ${className || ''}`}
      >
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
        </div>
        <p className="text-sm text-red-600">Failed to load history</p>
      </div>
    );
  }

  // Empty state
  if (queries.length === 0) {
    return (
      <div
        className={`w-64 border-r border-gray-200 bg-gray-50 p-4 ${className || ''}`}
      >
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No queries yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Start by asking a question below
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-64 border-r border-gray-200 bg-gray-50 flex flex-col ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200">
        <History className="h-5 w-5 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">
          History ({queries.length})
        </h2>
      </div>

      {/* Query List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {queries.map((query: Query) => (
            <QueryHistoryItem
              key={query.id}
              query={query}
              onClick={() => onSelectQuery?.(query)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Query History Item Component
interface QueryHistoryItemProps {
  query: Query;
  onClick: () => void;
}

function QueryHistoryItem({ query, onClick }: QueryHistoryItemProps) {
  const timestamp = format(new Date(query.created_at), 'MMM d, h:mm a');

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:bg-white transition-colors group"
    >
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Query Text */}
          <p className="text-sm text-gray-900 line-clamp-2 mb-1">
            {query.query_text}
          </p>

          {/* Timestamp + Confidence */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{timestamp}</span>
            {query.confidence_score !== null && (
              <span className="text-xs text-green-600 font-medium">
                {Math.round(query.confidence_score * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
