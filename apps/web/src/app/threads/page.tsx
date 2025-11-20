'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ThreadInterface } from '@/components/threads/ThreadInterface';
import { ThreadsPanel } from '@/components/threads/ThreadsPanel';

/**
 * Top-level Threads page - org-wide conversational AI interface.
 *
 * Features:
 * - ThreadInterface shows immediately (no space selection)
 * - Org-wide thread creation and queries
 * - ThreadsPanel at bottom for thread history
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
    <div className="flex flex-col h-full gap-8">
      {/* ThreadInterface - Main chat interface */}
      <div className="flex-1 overflow-hidden">
        <ThreadInterface onThreadCreated={handleThreadCreated} />
      </div>

      {/* ThreadsPanel - Bottom panel with thread history (flush with bottom) */}
      <AnimatePresence>
        <ThreadsPanel />
      </AnimatePresence>
    </div>
  );
}
