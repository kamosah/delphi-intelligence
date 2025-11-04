'use client';

import { useSpace } from '@/contexts/SpaceContext';
import { useQueryResults } from '@/hooks/useQueryResults';
import {
  Button,
  List,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@olympus/ui';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThreadListItem } from './ThreadListItem';

interface ThreadsPanelProps {
  className?: string;
  initialExpanded?: boolean;
}

/**
 * ThreadsPanel - Bottom panel with tabs for Threads, Documents, Data, and Projects
 *
 * Features:
 * - Tabbed interface for different content types
 * - Toggle to minimize/maximize panel (centered drag handle)
 * - Smooth animations for open/close states
 * - Flush with sides (no padding, no borders)
 * - Minimizes to toolbar height only
 * - Uses SpaceContext for spaceId access
 * - Navigates to individual thread pages on click
 * - Configurable initial expanded/collapsed state
 *
 */
export function ThreadsPanel({
  className,
  initialExpanded = true,
}: ThreadsPanelProps) {
  const { spaceId } = useSpace();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const { queryResults, isLoading } = useQueryResults(spaceId);

  // Sync expanded state when navigating between routes
  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [initialExpanded]);

  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? '30vh' : '60px' }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`bg-white border-t border-gray-200 flex flex-col relative ${className || ''}`}
    >
      {/* Drag Handle Toggle - Centered at top border */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-12 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          aria-label={isExpanded ? 'Minimize panel' : 'Expand panel'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-600" />
          )}
        </Button>
      </div>

      {/* Tabs - Always visible */}
      <Tabs
        defaultValue="threads"
        className="w-full flex flex-col h-full overflow-hidden"
      >
        {/* Tabs List - Always shown */}
        <div className="px-6 pt-4 border-b border-gray-200 shrink-0">
          <TabsList className="h-auto bg-transparent p-0 gap-6">
            <TabsTrigger
              value="threads"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 pb-3"
            >
              Threads
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 pb-3"
            >
              Documents
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 pb-3"
            >
              Data
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 pb-3"
            >
              Projects
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tabs Content - Only shown when expanded */}
        {isExpanded && (
          <div className="px-6 py-4 flex-1 overflow-auto">
            {/* Threads Tab */}
            <TabsContent value="threads" className="mt-0">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-sm text-gray-500">
                    Loading threads...
                  </div>
                ) : queryResults.length === 0 ? (
                  <div className="text-sm text-gray-500">No recent threads</div>
                ) : (
                  <List>
                    {queryResults.slice(0, 5).map((query) => (
                      <ThreadListItem key={query.id} thread={query} />
                    ))}
                  </List>
                )}
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0">
              <div className="text-sm text-gray-500">
                Documents coming soon...
              </div>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="mt-0">
              <div className="text-sm text-gray-500">
                Data connections coming soon...
              </div>
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="mt-0">
              <div className="text-sm text-gray-500">
                Projects coming soon...
              </div>
            </TabsContent>
          </div>
        )}
      </Tabs>
    </motion.div>
  );
}
