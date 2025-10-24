'use client';

import { Card, CardContent } from '@olympus/ui';
import { Space } from '@/hooks/useSpaces';
import { MoreVertical } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@olympus/ui';
import { useState } from 'react';
import { EditSpaceDialog } from './EditSpaceDialog';
import { DeleteSpaceDialog } from './DeleteSpaceDialog';

interface SpaceCardProps {
  space: Space;
  onClick?: () => void;
}

export function SpaceCard({ space, onClick }: SpaceCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Get first letter of space name for icon
  const initial = space.name.charAt(0).toUpperCase();

  // Use icon color if available, otherwise use a default
  const iconColor = space.iconColor || '#3B82F6';

  // Convert hex color to Tailwind-compatible style
  const getIconStyle = (color: string) => {
    // Extract color for background with opacity
    return {
      backgroundColor: `${color}20`, // '20' is hex for 32 (out of 255), which is approximately 12.5% opacity
      color: color,
    };
  };

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer group"
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold"
              style={getIconStyle(iconColor)}
            >
              {initial}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {space.memberCount}{' '}
                {space.memberCount === 1 ? 'member' : 'members'}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteOpen(true);
                    }}
                    className="text-red-600"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {space.name}
          </h3>

          {space.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {space.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {space.documentCount}{' '}
              {space.documentCount === 1 ? 'document' : 'documents'}
            </span>
            <span className="text-xs font-medium" style={{ color: iconColor }}>
              Active
            </span>
          </div>
        </CardContent>
      </Card>

      <EditSpaceDialog
        space={space}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <DeleteSpaceDialog
        space={space}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
