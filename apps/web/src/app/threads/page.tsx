'use client';

import { useRouter } from 'next/navigation';
import { ThreadInterface } from '@/components/threads/ThreadInterface';

/**
 * Top-level Threads page - org-wide conversational AI interface.
 *
 * Features:
 * - ThreadInterface shows immediately (no space selection)
 * - Org-wide thread creation and queries
 * - ThreadsSidebar shows recent threads and bookmarks
 * - Uses currentOrganization from Zustand auth store
 * - Navigates to individual thread page after first message
 */
export default function ThreadsPage() {
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
