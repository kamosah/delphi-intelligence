'use client';

import type { NavSection as NavSectionType } from '@olympus/types';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { NavItem } from './NavItem';
import { isNavItemActive, resolveHref } from './sidebar-utils';

interface NavSectionProps {
  /** Navigation section configuration */
  section: NavSectionType;
  /** Whether to show icon-only mode */
  iconMode: boolean;
  /** Current organization ID for dynamic href resolution */
  orgId?: string;
}

/**
 * Grouped navigation items with optional section header (Hex-style)
 * Used in settings navigation for WORKSPACE, ACCESS & SECURITY, ACCOUNT sections
 */
export function NavSection({ section, iconMode, orgId }: NavSectionProps) {
  const pathname = usePathname();

  return (
    <div>
      {/* Section Header */}
      {section.title && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{
            width: iconMode ? 0 : 'auto',
            opacity: iconMode ? 0 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          {!iconMode && (
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </h2>
          )}
        </motion.div>
      )}

      {/* Section Items */}
      <div className="space-y-1">
        {section.items.map((item) => {
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
      </div>
    </div>
  );
}
