'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Library } from 'lucide-react';
import { Button } from '@olympus/ui';
import { ThreadNavItem } from '@/components/threads/ThreadNavItem';
import { useThreads } from '@/hooks/useThreads';
import { cn } from '@/lib/utils';

interface ThreadsNavigationProps {
  iconMode: boolean;
  orgId?: string;
}

export function ThreadsNavigation({ iconMode, orgId }: ThreadsNavigationProps) {
  const router = useRouter();

  const { threads, isLoading } = useThreads({
    organizationId: orgId,
    limit: 50,
  });

  const bookmarkedThreads = threads.filter((t) => t.isStarred);
  const recentThreads = threads.filter((t) => !t.isStarred).slice(0, 10);

  const handleViewAllThreads = () => {
    router.push('/library');
  };

  if (isLoading) {
    return (
      <div className="text-center text-sm text-gray-500">
        Loading threads...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Threads Section */}
      <div className="space-y-2">
        {!iconMode && (
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Recent Threads
          </h3>
        )}
        <div className="space-y-1">
          {recentThreads.length > 0
            ? recentThreads.map((thread) => (
                <ThreadNavItem
                  key={thread.id}
                  thread={thread}
                  iconMode={iconMode}
                />
              ))
            : !iconMode && (
                <p className="px-2 text-sm text-gray-500">No threads yet</p>
              )}
        </div>

        {/* View All Button */}
        {recentThreads.length > 0 && (
          <Button
            variant="ghost"
            onClick={handleViewAllThreads}
            className={cn('w-full mt-2', !iconMode && 'px-0')}
            size={iconMode ? 'icon' : 'sm'}
          >
            <Library className="h-4 w-4 shrink-0" />
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{
                width: iconMode ? 0 : 'auto',
                opacity: iconMode ? 0 : 1,
              }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="ml-2 overflow-hidden whitespace-nowrap text-sm"
            >
              View All
            </motion.span>
          </Button>
        )}
      </div>

      {/* Bookmarks Section */}
      {bookmarkedThreads.length > 0 && (
        <div className="space-y-2">
          {!iconMode && (
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Bookmarks
            </h3>
          )}
          <div className="space-y-1">
            {bookmarkedThreads.map((thread) => (
              <ThreadNavItem
                key={thread.id}
                thread={thread}
                iconMode={iconMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
