'use client';

import { ThreadInterface } from '@/components/queries/ThreadInterface';
import { useRouter } from 'next/navigation';

/**
 * Threads landing page for a specific space.
 *
 * Layout:
 * - ThreadInterface (main area) - chat interface with constrained width
 * - ThreadsPanel (bottom) - provided by layout, shown expanded
 *
 * Features:
 * - Chat-style conversational interface (Hex-inspired design)
 * - Messages flow within input width
 * - Real-time streaming AI responses
 * - Source citations with document links
 * - Confidence scoring
 * - Navigate to new thread page after first message (auto-collapses ThreadsPanel)
 * - ThreadsPanel navigates to individual thread pages
 *
 * Note: SpaceProvider, ThreadsPanel, and positioning provided by threads layout.
 */
export default function ThreadsPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const handleThreadCreated = (threadId: string) => {
    // Navigate to the new thread page (layout will auto-collapse ThreadsPanel)
    router.push(`/dashboard/spaces/${params.id}/threads/${threadId}`);
  };

  return (
    <ThreadInterface
      onQuerySubmit={() => {
        // Optional: Add any additional logic when query is submitted
      }}
      onThreadCreated={handleThreadCreated}
    />
  );
}
