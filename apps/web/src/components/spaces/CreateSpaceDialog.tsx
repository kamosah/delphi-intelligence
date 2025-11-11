'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@olympus/ui';
import { SpaceForm, SpaceFormData } from './SpaceForm';
import { useCreateSpace } from '@/hooks/useSpaces';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSpaceDialog({
  open,
  onOpenChange,
}: CreateSpaceDialogProps) {
  const { createSpace, isCreating, error } = useCreateSpace();
  const { currentOrganization } = useAuthStore();

  const handleSubmit = async (data: SpaceFormData) => {
    if (!currentOrganization) {
      toast.error('Please select an organization first');
      return;
    }

    try {
      await createSpace({
        input: {
          organizationId: currentOrganization.id,
          name: data.name,
          description: data.description || null,
          iconColor: data.iconColor || null,
        },
      });

      toast.success('Space created successfully!');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create space:', err);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create space'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Space</DialogTitle>
          <DialogDescription>
            Create a new space to organize your documents and collaborate with
            your team.
          </DialogDescription>
        </DialogHeader>

        <SpaceForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create Space"
          isSubmitting={isCreating}
        />
      </DialogContent>
    </Dialog>
  );
}
