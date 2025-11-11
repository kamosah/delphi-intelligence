'use client';

import { ThreadInterface } from '@/components/threads/ThreadInterface';
import { ThreadsPanel } from '@/components/threads/ThreadsPanel';
import { useThread } from '@/hooks/useThreads';
import { Loader2 } from 'lucide-react';
import { use } from 'react';

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

/**
 * Individual Thread page - shows a specific thread conversation.
 *
 * Features:
 * - Loads existing thread data
 * - ThreadInterface with conversation history
 * - ThreadsPanel collapsed by default (can be expanded)
 * - Org-wide thread (no space context needed)
 */
export default function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = use(params);
  const { thread, isLoading, error } = useThread(threadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load thread</p>
          <p className="text-sm text-gray-600 mt-1">
            {error instanceof Error ? error.message : 'Thread not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-6">
      {/* ThreadInterface - Shows conversation history */}
      <div className="flex-1 overflow-hidden">
        <ThreadInterface initialThread={thread} />
      </div>

      {/* ThreadsPanel - Collapsed by default on individual thread pages */}
      <ThreadsPanel initialExpanded={false} />
    </div>
  );
}
