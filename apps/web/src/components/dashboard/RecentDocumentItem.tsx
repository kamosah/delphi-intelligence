import { Skeleton } from '@olympus/ui';
import { FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentDocumentItemProps {
  name: string;
  createdAt: string;
}

export function RecentDocumentItem({
  name,
  createdAt,
}: RecentDocumentItemProps) {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <FileText className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function RecentDocumentItemSkeleton() {
  return (
    <div className="flex items-center space-x-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
