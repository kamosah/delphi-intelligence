'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@olympus/ui';
import { Button } from '@olympus/ui';
import { Space, useDeleteSpace } from '@/hooks/useSpaces';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface DeleteSpaceDialogProps {
  space: Space;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSpaceDialog({
  space,
  open,
  onOpenChange,
}: DeleteSpaceDialogProps) {
  const { deleteSpace, isDeleting, error } = useDeleteSpace();

  const handleDelete = async () => {
    try {
      await deleteSpace({ id: space.id });

      toast.success('Space deleted successfully!');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete space:', err);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete space'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Space</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this space?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-700 mb-3">
            You are about to delete <strong>{space.name}</strong>.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-red-800 font-medium">
              This action cannot be undone.
            </p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>
                All {space.documentCount}{' '}
                {space.documentCount === 1 ? 'document' : 'documents'} will be
                deleted
              </li>
              <li>
                {space.memberCount}{' '}
                {space.memberCount === 1 ? 'member' : 'members'} will lose
                access
              </li>
              <li>All queries and data will be permanently removed</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Space'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
