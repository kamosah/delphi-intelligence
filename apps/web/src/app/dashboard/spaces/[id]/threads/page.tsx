'use client';

import { useRef, useState } from 'react';
import {
  QueryInterface,
  QueryInterfaceRef,
} from '@/components/queries/QueryInterface';
import { QueryPanel } from '@/components/queries/QueryPanel';
import type { QueryResult } from '@/hooks/useQueryResults';
import { AnimatePresence } from 'framer-motion';

interface ThreadsPageProps {
  params: {
    id: string;
  };
}

/**
 * Threads page for a specific space.
 *
 * Layout:
 * - QueryInterface (main area) - full-width chat interface
 * - QueryHistoryHorizontal (bottom) - horizontal scrolling history (shows on landing, hides in conversation)
 *
 * Features:
 * - Chat-style conversational interface
 * - Horizontal query history at bottom (Hex-inspired)
 * - Real-time streaming AI responses
 * - Source citations with document links
 * - Confidence scoring
 * - Search and filter history
 */
export default function ThreadsPage({ params }: ThreadsPageProps) {
  const spaceId = params.id;
  const queryInterfaceRef = useRef<QueryInterfaceRef>(null);
  const [isInConversation, setIsInConversation] = useState(false);

  const handleSelectQuery = (query: QueryResult) => {
    queryInterfaceRef.current?.loadQuery(query);
    setIsInConversation(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-8 bg-white">
      {/* Main Chat Interface - Full width, transparent background */}
      <div className="flex-1 p-6 overflow-hidden">
        <QueryInterface
          ref={queryInterfaceRef}
          spaceId={spaceId}
          onQuerySubmit={() => setIsInConversation(true)}
        />
      </div>

      {/* Query Panel - Bottom (show on landing, hide in conversation) */}
      <AnimatePresence>
        {!isInConversation && (
          <QueryPanel spaceId={spaceId} onSelectQuery={handleSelectQuery} />
        )}
      </AnimatePresence>
    </div>
  );
}
