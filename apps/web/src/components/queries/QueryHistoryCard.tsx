'use client';

import { type QueryResult } from '@/hooks/useQueryResults';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface QueryHistoryCardProps {
  query: QueryResult;
  onClick: () => void;
}

/**
 * QueryHistoryCard displays a single query in a card format (horizontal layout).
 *
 * Used in QueryPanel for the horizontal scrolling query history.
 *
 * @example
 * <QueryHistoryCard
 *   query={queryResult}
 *   onClick={() => loadQuery(queryResult)}
 * />
 */
export function QueryHistoryCard({ query, onClick }: QueryHistoryCardProps) {
  const timestamp = format(new Date(query.createdAt), 'MMM d, h:mm a');

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-80 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all bg-white text-left group"
    >
      <div className="flex items-start gap-2 mb-2">
        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-900 line-clamp-2 font-medium flex-1">
          {query.queryText}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>{timestamp}</span>
        {query.confidenceScore !== null &&
          query.confidenceScore !== undefined && (
            <span className="text-green-600 font-medium">
              {Math.round(query.confidenceScore * 100)}% confidence
            </span>
          )}
      </div>
    </button>
  );
}
