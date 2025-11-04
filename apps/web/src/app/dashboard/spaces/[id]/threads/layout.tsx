'use client';

import { SpaceProvider } from '@/contexts/SpaceContext';
import { ThreadsPanelProvider } from '@/contexts/ThreadsPanelContext';
import { ThreadsPanel } from '@/components/threads/ThreadsPanel';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

interface ThreadsLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

/**
 * Layout for all threads routes within a space.
 *
 * Provides:
 * - SpaceProvider context for all threads pages
 * - ThreadsPanel (always present, toggleable)
 * - Common positioning and styling
 * - Full viewport height with proper offset
 * - Auto-collapse ThreadsPanel on individual thread pages
 *
 * Wraps:
 * - /spaces/[id]/threads - Main threads list/landing (ThreadsPanel expanded)
 * - /spaces/[id]/threads/[threadId] - Individual thread view (ThreadsPanel collapsed)
 */
export default function ThreadsLayout({
  children,
  params,
}: ThreadsLayoutProps) {
  const spaceId = params.id;
  const pathname = usePathname();

  // Check if we're on the landing page or individual thread page
  const isLandingPage = pathname === `/dashboard/spaces/${spaceId}/threads`;

  return (
    <SpaceProvider spaceId={spaceId}>
      <ThreadsPanelProvider>
        <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-8 bg-white">
          {/* Main content area */}
          <div className="flex-1 overflow-hidden">{children}</div>

          {/* ThreadsPanel - Always present, initially expanded on landing, collapsed on individual threads */}
          <AnimatePresence>
            <ThreadsPanel initialExpanded={isLandingPage} />
          </AnimatePresence>
        </div>
      </ThreadsPanelProvider>
    </SpaceProvider>
  );
}
