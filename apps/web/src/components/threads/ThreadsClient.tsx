'use client';

import { useRouter } from 'next/navigation';
import { ThreadInterface } from '@/components/threads/ThreadInterface';

/**
 * Client component for Threads page.
 *
 * Threads data is prefetched via SSR - no loading state needed!
 */
export function ThreadsClient() {
  const router = useRouter();

  // Handle thread creation - navigate to individual thread page
  const handleThreadCreated = (threadId: string) => {
    router.push(`/threads/${threadId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ThreadInterface - Main chat interface */}
      <div className="flex-1 overflow-hidden">
        <ThreadInterface onThreadCreated={handleThreadCreated} />
      </div>
    </div>
  );
}
