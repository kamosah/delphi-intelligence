'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@olympus/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCreateSpace } from '@/hooks/useSpaces';
import type { SpaceFormData } from './SpaceForm';
import { SpaceForm } from './SpaceForm';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSpaceDialog({
  open,
  onOpenChange,
}: CreateSpaceDialogProps) {
  const router = useRouter();
  const { createSpace, isCreating, error } = useCreateSpace();
  const { currentOrganization } = useAuth();

  const handleSubmit = async (data: SpaceFormData) => {
    if (!currentOrganization) {
      toast.error('Please select an organization first');
      return;
    }

    try {
      const result = await createSpace({
        input: {
          organizationId: currentOrganization.id,
          name: data.name,
          description: data.description || null,
          iconColor: data.iconColor || null,
        },
      });

      toast.success('Space created successfully!');

      // Navigate to the newly created space FIRST, then close dialog
      if (result?.createSpace?.id) {
        router.push(`/dashboard/spaces/${result.createSpace.id}`);
        // Close dialog after navigation starts
        onOpenChange(false);
      } else {
        // Close dialog even if navigation fails
        onOpenChange(false);
      }
    } catch (err) {
      console.error('[CreateSpaceDialog] Failed to create space:', err);
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
          isSubmitting={isCreating}
        />
      </DialogContent>
    </Dialog>
  );
}
