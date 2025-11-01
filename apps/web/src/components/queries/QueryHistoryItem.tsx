'use client';

import { type QueryResult } from '@/hooks/useQueryResults';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface QueryHistoryItemProps {
  query: QueryResult;
  onClick: () => void;
}

/**
 * QueryHistoryItem displays a single query in a compact list format (vertical layout).
 *
 * Used in QueryHistory sidebar for the vertical list of queries.
 *
 * @example
 * <QueryHistoryItem
 *   query={queryResult}
 *   onClick={() => loadQuery(queryResult)}
 * />
 */
export function QueryHistoryItem({ query, onClick }: QueryHistoryItemProps) {
  const timestamp = format(new Date(query.createdAt), 'MMM d, h:mm a');

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200"
    >
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Query Text */}
          <p className="text-sm text-gray-900 line-clamp-2 mb-1.5 font-medium">
            {query.queryText}
          </p>

          {/* Timestamp + Confidence */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">{timestamp}</span>
            {query.confidenceScore !== null &&
              query.confidenceScore !== undefined && (
                <span className="text-green-600 font-medium">
                  {Math.round(query.confidenceScore * 100)}%
                </span>
              )}
          </div>
        </div>
      </div>
    </button>
  );
}
