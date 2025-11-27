'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Library, SquarePen } from 'lucide-react';
import { Button, Kbd, Skeleton } from '@olympus/ui';
import { ThreadNavItem } from '@/components/threads/ThreadNavItem';
import { useThreads } from '@/hooks/useThreads';

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

  const bookmarkedThreads = threads.filter((t) => t.isStarred).slice(0, 5);
  const recentThreads = threads.filter((t) => !t.isStarred).slice(0, 10);

  const handleNewThread = () => {
    router.push('/threads');
  };

  const handleViewAllThreads = () => {
    router.push('/library');
  };

  // Hide entire navigation in icon mode
  if (iconMode) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Thread Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={handleNewThread}
          className="w-full justify-between group"
        >
          <div className="flex items-center">
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="ml-2">New Thread</span>
          </div>
          <Kbd className="hidden group-hover:inline-flex text-[10px] ml-2">
            ⌘J
          </Kbd>
        </Button>
      </div>

      {/* Recent Threads Section */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Clickable Recent Header - Sticky */}
        <button
          onClick={handleViewAllThreads}
          className="group sticky top-0 flex items-center justify-between w-full px-2 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors bg-card z-10"
        >
          <span>Recent Threads</span>
          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Scrollable Thread List */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {recentThreads.length > 0 ? (
            recentThreads.map((thread) => (
              <ThreadNavItem key={thread.id} thread={thread} iconMode={false} />
            ))
          ) : (
            <p className="px-2 text-sm text-gray-500">No threads yet</p>
          )}
        </div>

        {/* View All Button */}
        {recentThreads.length > 0 && (
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={handleViewAllThreads}
              className="w-full justify-start"
            >
              <Library className="h-4 w-4 shrink-0" />
              <span className="ml-2 text-sm">View All</span>
            </Button>
          </div>
        )}
      </div>

      {/* Bookmarks Section */}
      {bookmarkedThreads.length > 0 && (
        <div className="mt-6">
          <h3 className="sticky top-0 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-card z-10">
            Bookmarks
          </h3>
          <div className="space-y-1 py-2">
            {bookmarkedThreads.map((thread) => (
              <ThreadNavItem key={thread.id} thread={thread} iconMode={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
