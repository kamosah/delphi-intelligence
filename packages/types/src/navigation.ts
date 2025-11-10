import type { LucideIcon } from 'lucide-react';

/**
 * Base navigation item interface
 */
export interface NavItemBase {
  /** Unique identifier for the nav item */
  id: string;
  /** Display label */
  label: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Optional description for tooltips */
  description?: string;
  /** Optional badge content (e.g., "3" for notifications) */
  badge?: string | number;
}

/**
 * Navigation item with static href
 */
export interface StaticNavItem extends NavItemBase {
  /** Static route path */
  href: string;
}

/**
 * Navigation item with dynamic href (e.g., org-scoped routes)
 */
export interface DynamicNavItem extends NavItemBase {
  /** Function to generate href based on org ID */
  href: (orgId: string) => string;
}

/**
 * Union type for all nav items
 */
export type NavItem = StaticNavItem | DynamicNavItem;

/**
 * Navigation section with grouped items (Hex-style)
 */
export interface NavSection {
  /** Section identifier */
  id: string;
  /** Section title (uppercase for Hex style) */
  title: string;
  /** Items in this section */
  items: NavItem[];
}
