'use client';

import { useState } from 'react';
import { useQueryResults, type QueryResult } from '@/hooks/useQueryResults';
import { ScrollArea, Input } from '@olympus/ui';
import { History, Search, ChevronLeft } from 'lucide-react';
import { QueryHistoryItem } from './QueryHistoryItem';
import { QueryHistoryCollapsed } from './QueryHistoryCollapsed';
import { QueryHistoryLoading } from './QueryHistoryLoading';
import { QueryHistoryError } from './QueryHistoryError';
import { QueryHistoryEmpty } from './QueryHistoryEmpty';

interface QueryHistoryProps {
  spaceId: string;
  onSelectQuery?: (query: QueryResult) => void;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { queryResults, isLoading, error } = useQueryResults(spaceId);

  // Filter queries based on search
  const filteredQueries = queryResults.filter((query) =>
    query.queryText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Collapsed state - show only toggle button
  if (isCollapsed) {
    return (
      <QueryHistoryCollapsed
        onExpand={() => setIsCollapsed(false)}
        className={className}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <QueryHistoryLoading
        onCollapse={() => setIsCollapsed(true)}
        className={className}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <QueryHistoryError
        onCollapse={() => setIsCollapsed(true)}
        className={className}
      />
    );
  }

  // Empty state
  if (queryResults.length === 0) {
    return (
      <QueryHistoryEmpty
        onCollapse={() => setIsCollapsed(true)}
        className={className}
      />
    );
  }

  return (
    <div
      className={`w-64 border-r border-gray-200 bg-white flex flex-col ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            History ({filteredQueries.length})
          </h2>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="hover:bg-gray-50 p-1 rounded transition-colors"
          title="Collapse history"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Query List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredQueries.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No matches found</p>
            </div>
          ) : (
            filteredQueries.map((query: QueryResult) => (
              <QueryHistoryItem
                key={query.id}
                query={query}
                onClick={() => onSelectQuery?.(query)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
