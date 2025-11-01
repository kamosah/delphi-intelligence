'use client';

/**
 * Skeleton loader for a single document list item during upload.
 * Shows a subtle loading state without distracting pulse animation.
 */
export function DocumentListItemSkeleton({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50/50">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Icon skeleton */}
        <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
          <div className="w-6 h-6 bg-blue-300 rounded" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Filename - show actual name */}
            <h4 className="text-sm font-medium text-gray-700 truncate">
              {fileName}
            </h4>
            {/* Status badge skeleton */}
            <div className="px-2 py-1 bg-blue-200 rounded-md">
              <span className="text-xs text-blue-700 font-medium">
                Uploading...
              </span>
            </div>
          </div>

          {/* Metadata skeleton */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="h-3 bg-blue-200 rounded w-20" />
            <span>•</span>
            <div className="h-3 bg-blue-200 rounded w-16" />
            <span>•</span>
            <div className="h-3 bg-blue-200 rounded w-24" />
          </div>
        </div>
      </div>

      {/* No action buttons during upload */}
    </div>
  );
}
