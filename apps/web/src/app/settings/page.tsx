import { redirect } from 'next/navigation';
import { getCurrentOrganizationId } from '@/lib/api/server-fetchers';

export default async function SettingsPage() {
  const currentOrgId = await getCurrentOrganizationId();

  // If no organization, redirect to profile (always available)
  if (!currentOrgId) {
    redirect('/settings/profile');
  }

  // If organization exists, redirect to organization settings
  redirect(`/settings/organizations/${currentOrgId}`);
}
