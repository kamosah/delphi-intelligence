'use client';

import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';
import { SettingsRow } from '@/components/settings/SettingsRow';
import {
  SettingsSection,
  SettingsSectionDivider,
} from '@/components/settings/SettingsSection';
import { SettingsToggleRow } from '@/components/settings/SettingsToggleRow';
import {
  useOrganization,
  useUpdateOrganization,
  type UpdateOrganizationInput,
} from '@/hooks/queries/useOrganizations';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Textarea,
} from '@olympus/ui';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Zod schema for organization settings validation
const organizationSettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

type OrganizationSettingsFormValues = z.infer<
  typeof organizationSettingsSchema
>;

export default function OrganizationSettingsPage() {
  const params = useParams();
  const organizationId = params.orgId as string;
  const { organization, isLoading, isSuccess } =
    useOrganization(organizationId);
  const { updateOrganization, isUpdating } = useUpdateOrganization();

  // Local state for toggles (not yet wired to backend)
  const [autoArchive, setAutoArchive] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);

  // React Hook Form with Zod validation
  const form = useForm<OrganizationSettingsFormValues>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Update form when organization data loads
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        description: organization.description || '',
      });
    }
  }, [organization, form]);

  // Form submission handler
  const onSubmit = async (values: OrganizationSettingsFormValues) => {
    try {
      const input: UpdateOrganizationInput = {
        name: values.name,
        description: values.description || undefined,
      };

      await updateOrganization({
        id: organizationId,
        input,
      });

      toast.success('Organization updated successfully');
    } catch (error) {
      toast.error('Failed to update organization');
      console.error('Failed to update organization:', error);
    }
  };

  if (!organization && !isLoading && isSuccess) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">Organization not found</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-4xl"
      >
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Organization Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization's information and preferences
          </p>
        </div>

        {/* Organization Overview Section */}
        <SettingsSection
          title="Organization Overview"
          description="Basic organization information"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <SettingsRow
                label="Organization name"
                description="This is your organization's visible name"
                loading={isLoading}
              >
                <FormItem className="space-y-1">
                  <FormControl>
                    <Input
                      {...field}
                      className="w-64"
                      placeholder="Enter organization name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </SettingsRow>
            )}
          />

          <SettingsSectionDivider />

          <SettingsRow
            label="Slug"
            description="Your organization's URL identifier (read-only)"
            loading={isLoading}
          >
            <Input
              value={organization?.slug || ''}
              className="w-64"
              disabled
              placeholder="organization-slug"
            />
          </SettingsRow>

          <SettingsSectionDivider />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <SettingsRow
                label="Description"
                description="A brief description of your organization"
                loading={isLoading}
              >
                <FormItem className="space-y-1">
                  <FormControl>
                    <Textarea
                      {...field}
                      className="w-64"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </SettingsRow>
            )}
          />
        </SettingsSection>

        {/* Organization Statistics */}
        <SettingsInfoCard
          title="Organization Statistics"
          description="Overview of your organization's activity"
          loading={isLoading}
          items={[
            {
              label: 'Members',
              value: organization?.memberCount || 0,
            },
            {
              label: 'Spaces',
              value: organization?.spaceCount || 0,
            },
            {
              label: 'Threads',
              value: organization?.threadCount || 0,
            },
            {
              label: 'Status',
              value: (
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              ),
            },
          ]}
        />

        {/* Preferences Section */}
        <SettingsSection
          title="Preferences"
          description="Configure organization behavior"
        >
          <SettingsToggleRow
            label="Auto-archive inactive spaces"
            description="Automatically archive spaces with no activity for 90 days"
            checked={autoArchive}
            onCheckedChange={setAutoArchive}
            loading={isLoading}
          />

          <SettingsSectionDivider />

          <SettingsToggleRow
            label="Require member approval"
            description="New members must be approved before joining"
            checked={requireApproval}
            onCheckedChange={setRequireApproval}
            loading={isLoading}
          />
        </SettingsSection>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty || isUpdating}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={!form.formState.isDirty || isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
