'use client';

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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod validation schema
const spaceFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .refine((val) => val.trim().length > 0, 'Name cannot be empty'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  iconColor: z.string(),
});

export type SpaceFormData = z.infer<typeof spaceFormSchema>;

interface SpaceFormProps {
  defaultValues?: Partial<SpaceFormData>;
  onSubmit: (data: SpaceFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

// Preset icon colors
const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

export function SpaceForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Create Space',
  isSubmitting = false,
}: SpaceFormProps) {
  const form = useForm<SpaceFormData>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      iconColor: defaultValues?.iconColor || PRESET_COLORS[0].value,
    },
  });

  const iconColor = form.watch('iconColor');
  const nameValue = form.watch('name');
  const descriptionValue = form.watch('description');

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
                <Input placeholder="e.g., Marketing Team" {...field} />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500">
                {nameValue?.length || 0}/100
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
                  placeholder="Describe what this space is for..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500">
                {descriptionValue?.length || 0}/500
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="iconColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon Color</FormLabel>
              <FormControl>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => field.onChange(color.value)}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        iconColor === color.value
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
