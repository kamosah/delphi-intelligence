'use client';

import Link from 'next/link';
import type { Citation } from '@/lib/api/queries-client';
import { Badge, Card } from '@olympus/ui';
import { FileText } from 'lucide-react';

interface CitationCardProps {
  citation: Citation;
  className?: string;
}

/**
 * CitationCard component displays a single source citation.
 *
 * Features:
 * - Citation index badge
 * - Text preview with ellipsis
 * - Relevance score indicator
 * - Clickable link to source document
 * - Hover state for better UX
 *
 * @example
 * <CitationCard
 *   citation={{
 *     index: 1,
 *     text: "This is the cited text...",
 *     document_id: "doc-123",
 *     document_title: "Annual Report 2024",
 *     chunk_index: 0,
 *     similarity_score: 0.95
 *   }}
 * />
 */
export function CitationCard({ citation, className }: CitationCardProps) {
  const similarityPercent = Math.round(citation.similarity_score * 100);

  // Determine relevance color based on score
  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <Card
      className={`p-4 hover:shadow-md transition-shadow ${className || ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Citation Index Badge */}
        <Badge variant="secondary" className="shrink-0">
          [{citation.index}]
        </Badge>

        <div className="flex-1 min-w-0">
          {/* Document Title */}
          {citation.document_title && (
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <p className="text-xs font-medium text-gray-900 truncate">
                {citation.document_title}
              </p>
            </div>
          )}

          {/* Citation Text */}
          <p className="text-sm text-gray-700 line-clamp-3 mb-3">
            {citation.text}
          </p>

          {/* Footer: Similarity Score + Link */}
          <div className="flex items-center justify-between gap-2">
            {/* Similarity Score */}
            <span
              className={`text-xs font-medium ${getRelevanceColor(citation.similarity_score)}`}
            >
              {similarityPercent}% relevant
            </span>

            {/* View Source Link */}
            <Link
              href={`/dashboard/documents/${citation.document_id}?chunk=${citation.chunk_index}`}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              View source →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
