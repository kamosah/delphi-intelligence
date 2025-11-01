'use client';

import { useState } from 'react';
import { useQueryResults, type QueryResult } from '@/hooks/useQueryResults';
import { ScrollArea, Input } from '@olympus/ui';
import { MessageSquare, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { QueryHistoryCard } from './QueryHistoryCard';

interface QueryPanelProps {
  spaceId: string;
  onSelectQuery?: (query: QueryResult) => void;
  className?: string;
}

/**
 * QueryPanel displays past queries in a horizontal layout at the bottom of the page.
 *
 * Features:
 * - Horizontal scrolling list of previous queries
 * - Search/filter functionality
 * - Shows on landing, hides when conversation starts
 * - Hex-inspired minimal aesthetic
 *
 * @example
 * <QueryPanel
 *   spaceId="space-123"
 *   onSelectQuery={(query) => handleLoadQuery(query)}
 * />
 */
export function QueryPanel({
  spaceId,
  onSelectQuery,
  className,
}: QueryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { queryResults, isLoading, error } = useQueryResults(spaceId);

  // Filter queries based on search
  const filteredQueries = queryResults.filter((query) =>
    query.queryText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`border-t border-gray-200 bg-white ${className || ''}`}
    >
      {/* Header with Search */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <MessageSquare className="h-5 w-5 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">Recent Queries</h3>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Horizontal Scrolling Query List */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 p-4">
          {isLoading && (
            <div className="text-sm text-gray-500">Loading queries...</div>
          )}

          {error && (
            <div className="text-sm text-red-600">Failed to load queries</div>
          )}

          {!isLoading && !error && filteredQueries.length === 0 && (
            <div className="text-sm text-gray-500 text-center w-full py-4">
              {searchQuery
                ? 'No matching queries found'
                : 'No queries yet. Start by asking a question above.'}
            </div>
          )}

          {filteredQueries.map((query) => (
            <QueryHistoryCard
              key={query.id}
              query={query}
              onClick={() => onSelectQuery?.(query)}
            />
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
