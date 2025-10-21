'use client';

import { useEffect, useRef } from 'react';
import type { Citation } from '@/lib/api/queries-client';
import { QueryMessage } from './QueryMessage';
import { CitationList } from './CitationList';
import { Alert } from '@olympus/ui';
import { Loader2, AlertCircle } from 'lucide-react';

interface QueryResponseProps {
  response: string;
  citations: Citation[];
  isStreaming: boolean;
  error: string | null;
  confidenceScore?: number | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * QueryResponse component displays AI response with streaming support.
 *
 * Features:
 * - Real-time token streaming display
 * - Animated typing indicator during streaming
 * - Citation integration
 * - Error state with retry button
 * - Auto-scroll to bottom as content streams
 *
 * @example
 * <QueryResponse
 *   response={response}
 *   citations={citations}
 *   isStreaming={isStreaming}
 *   error={error}
 *   confidenceScore={confidenceScore}
 * />
 */
export function QueryResponse({
  response,
  citations,
  isStreaming,
  error,
  confidenceScore,
  onRetry,
  className,
}: QueryResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [response, citations]);

  // Error state
  if (error) {
    return (
      <div className={`p-4 ${className || ''}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <p className="text-sm font-medium text-red-800">Query Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium underline"
              >
                Try again
              </button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  // Loading state (before any content arrives)
  if (isStreaming && !response) {
    return (
      <div
        className={`flex items-center justify-center p-8 ${className || ''}`}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Searching documents...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!response && !isStreaming) {
    return null;
  }

  return (
    <div ref={containerRef} className={`space-y-4 ${className || ''}`}>
      {/* AI Response Message */}
      <QueryMessage
        role="assistant"
        content={response}
        timestamp={new Date()}
        confidenceScore={confidenceScore || undefined}
      />

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="px-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
          <span className="text-xs text-gray-600">Generating response...</span>
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className="px-4 pb-4">
          <CitationList citations={citations} />
        </div>
      )}
    </div>
  );
}
