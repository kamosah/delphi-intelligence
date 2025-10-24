'use client';

import { Space } from '@/hooks/useSpaces';
import { SpaceCard } from './SpaceCard';

interface SpaceGridProps {
  spaces: Space[];
  onSpaceClick?: (space: Space) => void;
}

export function SpaceGrid({ spaces, onSpaceClick }: SpaceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => (
        <SpaceCard
          key={space.id}
          space={space}
          onClick={() => onSpaceClick?.(space)}
        />
      ))}
    </div>
  );
}
