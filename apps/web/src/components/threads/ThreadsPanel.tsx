'use client';

import { useSpace } from '@/contexts/SpaceContext';
import { useThreadsPanel } from '@/contexts/ThreadsPanelContext';
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
import { useEffect, useRef, type ComponentProps } from 'react';
import { ThreadListItem } from './ThreadListItem';

interface ThreadsPanelProps {
  className?: string;
  initialExpanded?: boolean;
  onMinimize?: () => void;
}

/**
 * ThreadsPanelTabTrigger - Custom TabTrigger with Hex-style underline design
 *
 * Supports optional className prop for additional customization
 */
function ThreadsPanelTabTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      {...props}
      className={`data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 pb-3 ${className || ''}`}
    />
  );
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
 * - External minimize control via onMinimize callback
 *
 */
export function ThreadsPanel({
  className,
  initialExpanded = true,
  onMinimize,
}: ThreadsPanelProps) {
  const { spaceId } = useSpace();
  const { isExpanded, toggle, minimize, expand } = useThreadsPanel();
  const { queryResults, isLoading } = useQueryResults(spaceId);
  const prevInitialExpanded = useRef(initialExpanded);

  // Only sync expanded state when initialExpanded actually changes
  // (i.e., when navigating between routes)
  useEffect(() => {
    if (prevInitialExpanded.current !== initialExpanded) {
      if (initialExpanded) {
        expand();
      } else {
        minimize();
      }
      prevInitialExpanded.current = initialExpanded;
    }
  }, [initialExpanded, expand, minimize]);

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
          onClick={toggle}
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
            <ThreadsPanelTabTrigger value="threads">
              Threads
            </ThreadsPanelTabTrigger>
            <ThreadsPanelTabTrigger value="documents">
              Documents
            </ThreadsPanelTabTrigger>
            <ThreadsPanelTabTrigger value="data">Data</ThreadsPanelTabTrigger>
            <ThreadsPanelTabTrigger value="projects">
              Projects
            </ThreadsPanelTabTrigger>
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
