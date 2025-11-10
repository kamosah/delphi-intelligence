'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@olympus/ui';

// Zod validation schema
const organizationFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .refine((val) => val.trim().length > 0, 'Name cannot be empty'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
});

export type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface CreateOrganizationFormProps {
  onSubmit: (data: OrganizationFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CreateOrganizationForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateOrganizationFormProps) {
  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  aria-required="true"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500">
                {field.value?.length || 0}/100
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What does your organization do?"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500">
                {field.value?.length || 0}/500
              </p>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? 'Creating...' : 'Create organization'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
