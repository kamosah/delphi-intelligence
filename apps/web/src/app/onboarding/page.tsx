'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@olympus/ui';
import {
  CreateOrganizationForm,
  type OrganizationFormData,
} from '@/components/organizations/CreateOrganizationForm';
import { useCreateOrganization } from '@/hooks/useOrganizations';

/**
 * Onboarding page for creating the user's first organization.
 *
 * Provides a welcoming experience with clear explanation of what
 * organizations are and why they're needed.
 */
export default function OnboardingPage() {
  const router = useRouter();
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
        // Redirect to the new organization's settings page
        router.push(`/settings/organizations/${result.createOrganization.id}`);
      }
    } catch (err) {
      console.error('Failed to create organization:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to create organization'
      );
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome to Olympus
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Let's create your organization
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Organizations help you collaborate with your team on spaces,
            documents, and AI-powered analysis. You can invite team members and
            manage access controls.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <CreateOrganizationForm
            onSubmit={handleSubmit}
            onCancel={handleSkip}
            isSubmitting={isCreating}
          />
        </div>

        {/* Skip Option */}
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isCreating}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>You can always create an organization later from settings</p>
        </div>
      </div>
    </div>
  );
}
