'use client';

import { ThreadInterface } from '@/components/threads/ThreadInterface';
import { ThreadsPanel } from '@/components/threads/ThreadsPanel';
import { AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

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
  const pathname = usePathname();

  // Handle thread creation - navigate to individual thread page
  const handleThreadCreated = (threadId: string) => {
    router.push(`/threads/${threadId}`);
  };
  const normalizedPath = pathname.replace(/\/$/, '');
  const isLandingPage = normalizedPath === '/threads';

  return (
    <div className="flex flex-col h-full gap-6">
      {/* ThreadInterface - Main chat interface */}
      <div className="flex-1 overflow-hidden">
        <ThreadInterface onThreadCreated={handleThreadCreated} />
      </div>

      {/* ThreadsPanel - Bottom panel with thread history (flush with bottom) */}
      <AnimatePresence>
        <ThreadsPanel initialExpanded={isLandingPage} />
      </AnimatePresence>
    </div>
  );
}
