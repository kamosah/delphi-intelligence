'use client';

import { usePathname } from 'next/navigation';
import { NavItem } from './NavItem';
import { DASHBOARD_NAV_ITEMS, SETTINGS_NAV_ITEM } from './sidebar-navigation';
import { isNavItemActive, resolveHref } from './sidebar-utils';

interface DashboardNavigationProps {
  iconMode: boolean;
  orgId?: string;
}

export function DashboardNavigation({
  iconMode,
  orgId,
}: DashboardNavigationProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-2">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const href = resolveHref(item.href, orgId);
        const isActive = isNavItemActive(item, pathname, orgId);

        return (
          <NavItem
            key={item.id}
            item={item}
            isActive={isActive}
            iconMode={iconMode}
            href={href}
          />
        );
      })}

      {/* Divider */}
      <div className="my-2 h-px bg-gray-200" />

      {/* Settings Link */}
      <NavItem
        item={SETTINGS_NAV_ITEM}
        isActive={false}
        iconMode={iconMode}
        href={
          orgId
            ? resolveHref(SETTINGS_NAV_ITEM.href, orgId)
            : '/settings/profile'
        }
      />
    </div>
  );
}
