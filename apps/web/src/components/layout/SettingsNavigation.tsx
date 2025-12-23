'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { NavSection } from './NavSection';
import { SETTINGS_NAV_SECTIONS } from './sidebar-navigation';

interface SettingsNavigationProps {
  iconMode: boolean;
  orgId?: string;
}

export function SettingsNavigation({
  iconMode,
  orgId,
}: SettingsNavigationProps) {
  const { currentOrganization } = useAuthStore();

  // Filter out WORKSPACE section if no organization exists
  // This prevents broken links like /settings/organizations/undefined
  const sections = SETTINGS_NAV_SECTIONS.filter((section) => {
    if (section.id === 'workspace' && !currentOrganization) {
      return false; // Hide workspace items when no org
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <NavSection
          key={section.id}
          section={section}
          iconMode={iconMode}
          orgId={orgId}
        />
      ))}
    </div>
  );
}
