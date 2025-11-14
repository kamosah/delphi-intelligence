'use client';

import { ThreadInterface } from '@/components/threads/ThreadInterface';
import { ThreadsPanel } from '@/components/threads/ThreadsPanel';
import { useThread } from '@/hooks/useThreads';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

/**
 * Individual Thread page - shows a specific thread conversation.
 *
 * Features:
 * - Loads existing thread data
 * - ThreadInterface with conversation history
 * - ThreadsPanel collapsed by default (can be expanded)
 * - Org-wide thread (no space context needed)
 */
export default function ThreadPage() {
  const { threadId } = useParams() as { threadId: string };
  const { thread, isLoading, error, isSuccess } = useThread(threadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load thread</p>
          <p className="text-sm text-gray-600 mt-1">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  // Handle not found state (query succeeded but no thread)
  if (isSuccess && !thread) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <p className="text-gray-800 font-medium">Thread not found</p>
          <p className="text-sm text-gray-600 mt-1">
            This thread may have been deleted or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-6">
      {/* ThreadInterface - Shows conversation history */}
      <div className="flex-1 overflow-hidden">
        <ThreadInterface initialThread={thread || undefined} />
      </div>

      {/* ThreadsPanel - Collapsed by default on individual thread pages */}
      <ThreadsPanel initialExpanded={false} />
    </div>
  );
}
