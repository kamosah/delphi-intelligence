'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Skeleton } from '@olympus/ui';
import { useSpaces } from '@/hooks/useSpaces';
import { SpaceGrid } from '@/components/spaces/SpaceGrid';
import { SpaceListEmpty } from '@/components/spaces/SpaceListEmpty';
import { CreateSpaceDialog } from '@/components/spaces/CreateSpaceDialog';

export default function SpacesPage() {
  const router = useRouter();
  const { spaces, isLoading, error } = useSpaces();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleSpaceClick = (space: { id: string }) => {
    router.push(`/dashboard/spaces/${space.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spaces</h1>
          <p className="text-gray-600">
            Organize your documents into collaborative workspaces.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Create Space
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Failed to load spaces. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && spaces.length === 0 && (
        <SpaceListEmpty onCreateClick={() => setIsCreateDialogOpen(true)} />
      )}

      {!isLoading && !error && spaces.length > 0 && (
        <SpaceGrid spaces={spaces} onSpaceClick={handleSpaceClick} />
      )}

      <CreateSpaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
