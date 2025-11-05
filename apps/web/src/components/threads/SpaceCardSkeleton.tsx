'use client';

import { Card, CardContent, CardHeader, Skeleton } from '@olympus/ui';

/**
 * Loading skeleton for Space cards in Threads landing page.
 * Displays placeholder cards while spaces are being fetched.
 */
export function SpaceCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of SpaceCardSkeletons for loading state
 */
export function SpaceCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SpaceCardSkeleton key={i} />
      ))}
    </div>
  );
}
