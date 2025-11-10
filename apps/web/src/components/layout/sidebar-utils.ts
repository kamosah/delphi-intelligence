import type { NavItem } from '@olympus/types';

/**
 * Resolves a nav item's href, handling both static and dynamic hrefs
 *
 * @param href - Static string or function that takes org ID
 * @param orgId - Current organization ID (optional)
 * @returns Resolved href string
 */
export function resolveHref(
  href: string | ((orgId: string) => string),
  orgId?: string
): string {
  if (typeof href === 'function') {
    // Dynamic href - need org ID
    if (!orgId) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Dynamic href requires organizationId but none provided');
      }
      return '#';
    }
    return href(orgId);
  }
  // Static href
  return href;
}

/**
 * Determines if a nav item is active based on current pathname
 *
 * @param item - Navigation item
 * @param pathname - Current pathname from usePathname()
 * @param orgId - Current organization ID (optional)
 * @returns Whether the nav item is active
 */
export function isNavItemActive(
  item: NavItem,
  pathname: string,
  orgId?: string
): boolean {
  const href = resolveHref(item.href, orgId);

  // Exact match for settings routes
  if (pathname.startsWith('/settings')) {
    return pathname === href;
  }

  // Prefix match for dashboard routes
  return pathname.startsWith(href);
}
