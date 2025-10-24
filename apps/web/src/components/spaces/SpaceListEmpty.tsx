'use client';

import { Button } from '@olympus/ui';
import { FolderPlus } from 'lucide-react';

interface SpaceListEmptyProps {
  onCreateClick: () => void;
}

export function SpaceListEmpty({ onCreateClick }: SpaceListEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FolderPlus className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No spaces yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm">
        Create your first space to start organizing documents and collaborating
        with your team.
      </p>
      <Button onClick={onCreateClick}>Create your first space</Button>
    </div>
  );
}
