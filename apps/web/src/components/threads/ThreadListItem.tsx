'use client';

import type { Thread } from '@/hooks/useThreads';
import { ListItem, Typography } from '@olympus/ui';
import Link from 'next/link';

interface ThreadListItemProps {
  thread: Thread;
}

/**
 * ThreadListItem - Individual thread list item for ThreadsPanel
 *
 * Features:
 * - Displays thread query text and creation date
 * - Navigates to individual thread page using Next Link
 * - Hover state for interactivity
 * - Truncates long text
 * - Semantic list item markup
 * - Links to org-wide thread route (/threads/[id])
 */
export function ThreadListItem({ thread }: ThreadListItemProps) {
  return (
    <ListItem>
      <Link
        href={`/threads/${thread.id}`}
        className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left w-full"
      >
        <div className="flex-1 min-w-0">
          <Typography variant="small" className="text-gray-900 truncate">
            {thread.queryText}
          </Typography>
          <Typography variant="muted" className="mt-1">
            {new Date(thread.createdAt).toLocaleDateString()}
          </Typography>
        </div>
      </Link>
    </ListItem>
  );
}
