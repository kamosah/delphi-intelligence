'use client';

import { ThreadInterface } from '@/components/queries/ThreadInterface';
import { useThread } from '@/hooks/queries/useThread';

interface ThreadPageProps {
  params: {
    threadId: string;
  };
}

/**
 * Individual thread page for a specific conversation.
 *
 * Route: /spaces/[space-id]/threads/[thread-id]
 *
 * Features:
 * - Focused thread view with existing conversation
 * - Loads existing thread from history using GraphQL
 * - Continue conversation
 * - ThreadsPanel provided by layout (initially collapsed)
 *
 * Note: SpaceProvider, ThreadsPanel, and positioning provided by threads layout.
 */
export default function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = params;

  // Fetch thread data using GraphQL query
  const { data, isLoading, error } = useThread(threadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading thread...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error loading thread: {error.message}</p>
      </div>
    );
  }

  if (!data?.thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Thread not found</p>
      </div>
    );
  }

  // Pass initial thread data to ThreadInterface
  return <ThreadInterface initialThread={data.thread} />;
}
