'use client';

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
  return (
    <div className="space-y-6">
      {SETTINGS_NAV_SECTIONS.map((section) => (
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
