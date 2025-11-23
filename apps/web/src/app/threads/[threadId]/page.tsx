'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ThreadInterface } from '@/components/threads/ThreadInterface';
import { useThread } from '@/hooks/useThreads';
import { useStreamingStore } from '@/lib/stores/streaming-store';

/**
 * Individual Thread page - shows a specific thread conversation.
 *
 * Features:
 * - Loads existing thread data
 * - ThreadInterface with conversation history
 * - ThreadsSidebar shows recent threads and bookmarks
 * - Org-wide thread (no space context needed)
 * - Checks streaming store first for active streams
 * - Seamless navigation during streaming (no loading spinner)
 */
export default function ThreadPage() {
  const { threadId } = useParams() as { threadId: string };
  const { thread, isLoading, error, isSuccess } = useThread(threadId);
  const { getSession } = useStreamingStore();

  // Check if this thread has an active streaming session
  const streamingSession = getSession(threadId);

  // If thread is actively streaming, skip loading state and show ThreadInterface immediately
  // This prevents the "thread not found" error when navigating during streaming
  if (streamingSession?.isStreaming) {
    return (
      <div className="flex flex-col h-full">
        {/* ThreadInterface - Shows streaming conversation in real-time */}
        <div className="flex-1 overflow-hidden">
          <ThreadInterface initialThread={thread || undefined} />
        </div>
      </div>
    );
  }

  // Only show loading state if not streaming AND loading from backend
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

  // Handle not found state (query succeeded but no thread and not streaming)
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
    <div className="flex flex-col h-full">
      {/* ThreadInterface - Shows conversation history */}
      <div className="flex-1 overflow-hidden">
        <ThreadInterface initialThread={thread || undefined} />
      </div>
    </div>
  );
}
