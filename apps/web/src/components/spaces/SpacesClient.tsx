'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@olympus/ui';
import { CreateSpaceDialog } from '@/components/spaces/CreateSpaceDialog';
import { SpaceGrid } from '@/components/spaces/SpaceGrid';
import { SpaceListEmpty } from '@/components/spaces/SpaceListEmpty';
import { useSpaces } from '@/hooks/useSpaces';

export function SpacesClient() {
  const router = useRouter();
  const { spaces, error } = useSpaces(); // No loading state - data is prefetched!
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
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="new-space-button"
        >
          Create Space
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Failed to load spaces. Please try again.
          </p>
        </div>
      )}

      {!error && spaces.length === 0 && (
        <SpaceListEmpty onCreateClick={() => setIsCreateDialogOpen(true)} />
      )}

      {!error && spaces.length > 0 && (
        <SpaceGrid spaces={spaces} onSpaceClick={handleSpaceClick} />
      )}

      <CreateSpaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
