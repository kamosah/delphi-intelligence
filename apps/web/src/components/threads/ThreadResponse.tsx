'use client';

import { useEffect, useRef } from 'react';
import type { Citation } from '@/lib/api/queries-client';
import { ThreadMessage } from './ThreadMessage';
import { CitationList } from './CitationList';
import { Alert } from '@olympus/ui';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  MAX_RETRY_ATTEMPTS,
  NON_RETRYABLE_ERRORS,
} from '@/constants/streaming';

// Error code to title mapping
const ERROR_TITLES: Record<string, string> = {
  TIMEOUT: 'Query Timeout',
  RATE_LIMIT: 'Rate Limit Exceeded',
  API_ERROR: 'AI Service Unavailable',
  DATABASE_ERROR: 'Database Error',
  UNKNOWN: 'Query Failed',
};

interface ThreadResponseProps {
  response: string;
  citations: Citation[];
  isStreaming: boolean;
  error: string | null;
  errorCode?: string;
  retryCount?: number;
  confidenceScore?: number | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * ThreadResponse component displays AI response with streaming support.
 *
 * Features:
 * - Real-time token streaming display
 * - Animated typing indicator during streaming
 * - Citation integration
 * - Error state with retry button
 * - Auto-scroll to bottom as content streams
 *
 * @example
 * <ThreadResponse
 *   response={response}
 *   citations={citations}
 *   isStreaming={isStreaming}
 *   error={error}
 *   confidenceScore={confidenceScore}
 * />
 */
export function ThreadResponse({
  response,
  citations,
  isStreaming,
  error,
  errorCode,
  retryCount = 0,
  confidenceScore,
  onRetry,
  className,
}: ThreadResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [response, citations]);

  // Error state with enhanced messaging
  if (error) {
    // Get error title from mapping with fallback
    const errorTitle = ERROR_TITLES[errorCode ?? ''] ?? 'Query Failed';

    // Determine if error is retryable
    const isRetryable = !NON_RETRYABLE_ERRORS.includes(errorCode ?? '');

    // Show retry button if handler provided and under max retries
    const showRetryButton =
      onRetry && (!retryCount || retryCount < MAX_RETRY_ATTEMPTS);

    return (
      <div className={`p-4 ${className || ''}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="ml-2 flex-1">
            <p className="text-sm font-medium text-red-800">{errorTitle}</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>

            {/* Retry count indicator */}
            {retryCount > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Retry attempt {retryCount}/3 failed
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-3">
              {showRetryButton && (
                <button
                  onClick={onRetry}
                  className="text-sm text-red-600 hover:text-red-700 font-medium underline"
                >
                  {isRetryable ? 'Retry query' : 'Try new query'}
                </button>
              )}
              {!showRetryButton && (
                <p className="text-xs text-red-600">
                  {isRetryable
                    ? 'Please wait a moment and try again'
                    : 'Please try rephrasing your question'}
                </p>
              )}
            </div>
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
      <ThreadMessage
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
