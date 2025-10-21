'use client';

import type { Citation } from '@/lib/api/queries-client';
import { CitationCard } from './CitationCard';
import { FileQuestion } from 'lucide-react';

interface CitationListProps {
  citations: Citation[];
  className?: string;
}

/**
 * CitationList component displays a collection of source citations.
 *
 * Features:
 * - Grid layout for multiple citations
 * - Empty state when no citations
 * - Responsive grid columns
 *
 * @example
 * <CitationList citations={citations} />
 */
export function CitationList({ citations, className }: CitationListProps) {
  // Empty state
  if (citations.length === 0) {
    return (
      <div className={`text-center py-8 ${className || ''}`}>
        <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No sources cited yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Sources ({citations.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {citations.map((citation) => (
          <CitationCard
            key={`${citation.document_id}-${citation.index}`}
            citation={citation}
          />
        ))}
      </div>
    </div>
  );
}
