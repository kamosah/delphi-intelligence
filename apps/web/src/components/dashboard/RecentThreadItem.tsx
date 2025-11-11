import { Skeleton } from '@olympus/ui';
import { formatDistanceToNow } from 'date-fns';

interface RecentThreadItemProps {
  queryText: string;
  createdAt: string;
}

export function RecentThreadItem({
  queryText,
  createdAt,
}: RecentThreadItemProps) {
  return (
    <div className="border-l-4 border-blue-500 pl-4">
      <p className="text-sm text-gray-900 line-clamp-2">{queryText}</p>
      <p className="text-xs text-gray-500 mt-1">
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}

export function RecentThreadItemSkeleton() {
  return (
    <div className="border-l-4 border-gray-300 pl-4">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
