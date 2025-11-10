'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@olympus/ui';
import {
  CreateOrganizationForm,
  type OrganizationFormData,
} from './CreateOrganizationForm';
import {
  useCreateOrganization,
  type Organization,
} from '@/hooks/queries/useOrganizations';
import { toast } from 'sonner';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (organization: Organization) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const { createOrganization, isCreating } = useCreateOrganization();

  const handleSubmit = async (data: OrganizationFormData) => {
    try {
      const result = await createOrganization({
        input: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
        },
      });

      if (result.createOrganization) {
        toast.success('Organization created successfully!');
        onOpenChange(false);
        onSuccess?.(result.createOrganization);
      }
    } catch (err) {
      console.error('Failed to create organization:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to create organization'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Organizations let you collaborate with your team on spaces and
            documents.
          </DialogDescription>
        </DialogHeader>

        <CreateOrganizationForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isCreating}
        />
      </DialogContent>
    </Dialog>
  );
}
