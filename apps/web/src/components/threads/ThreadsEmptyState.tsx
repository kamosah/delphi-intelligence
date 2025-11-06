'use client';

import { MessageSquarePlus } from 'lucide-react';

/**
 * ThreadsEmptyState - Empty state for the threads interface
 *
 * Displays a welcoming message when no conversation has started yet.
 * Clean, minimal design to focus user attention on starting a conversation.
 * Parent container handles positioning/centering.
 */
export function ThreadsEmptyState() {
  return (
    <div className="text-center max-w-md p-8">
      <MessageSquarePlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Ask Athena AI
      </h3>
      <p className="text-sm text-gray-600">
        Ask questions about your documents and get AI-powered answers with
        source citations in real-time.
      </p>
    </div>
  );
}
