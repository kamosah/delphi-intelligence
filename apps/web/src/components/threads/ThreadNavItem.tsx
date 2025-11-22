'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Button } from '@olympus/ui';
import type { Thread } from '@/lib/api/generated';
import { cn } from '@/lib/utils';
import { ThreadRowActions } from './ThreadRowActions';

interface ThreadNavItemProps {
  /** Thread data */
  thread: Thread;
  /** Whether to show icon-only mode */
  iconMode: boolean;
}

/**
 * Navigation item for threads in the threads sidebar
 * Shows thread title, star icon, and row actions with fade effect
 */
export function ThreadNavItem({ thread, iconMode }: ThreadNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/threads/${thread.id}`;

  // Get thread display title (use title or first 50 chars of query)
  const threadTitle = thread.title || thread.queryText.slice(0, 50);

  return (
    <div className="group relative">
      <Button
        variant="ghost"
        size={iconMode ? 'icon' : 'default'}
        className={cn(
          'w-full',
          !iconMode && 'justify-start gap-3 pr-8',
          isActive &&
            'bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700'
        )}
        asChild
      >
        <Link href={`/threads/${thread.id}`}>
          {thread.isStarred && (
            <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
          {!thread.isStarred && iconMode && (
            <div className="h-4 w-4 shrink-0" />
          )}
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{
              width: iconMode ? 0 : 'auto',
              opacity: iconMode ? 0 : 1,
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="relative overflow-hidden text-sm font-medium"
            style={{
              maskImage:
                'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, black 85%, transparent 100%)',
            }}
          >
            {threadTitle}
          </motion.span>
        </Link>
      </Button>

      {/* Row Actions - only visible on hover and in full mode */}
      {!iconMode && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <ThreadRowActions thread={thread} />
        </div>
      )}
    </div>
  );
}
