'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@olympus/ui';
import { SpaceForm, SpaceFormData } from './SpaceForm';
import { Space, useUpdateSpace } from '@/hooks/useSpaces';
import { toast } from 'sonner';

interface EditSpaceDialogProps {
  space: Space;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSpaceDialog({
  space,
  open,
  onOpenChange,
}: EditSpaceDialogProps) {
  const { updateSpace, isUpdating, error } = useUpdateSpace();

  const handleSubmit = async (data: SpaceFormData) => {
    try {
      await updateSpace({
        id: space.id,
        input: {
          name: data.name,
          description: data.description || null,
          iconColor: data.iconColor || null,
        },
      });

      toast.success('Space updated successfully!');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update space:', err);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update space'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Space</DialogTitle>
          <DialogDescription>
            Update the details of your space.
          </DialogDescription>
        </DialogHeader>

        <SpaceForm
          defaultValues={{
            name: space.name,
            description: space.description || '',
            iconColor: space.iconColor || undefined,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
          isSubmitting={isUpdating}
        />
      </DialogContent>
    </Dialog>
  );
}
