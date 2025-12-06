import { useIsMutating } from '@tanstack/react-query';

/**
 * Check if an organization switch is currently in progress.
 *
 * Uses React Query's global mutation state to detect if the
 * switchOrganization mutation is running anywhere in the app.
 *
 * This is a global state that works across all components,
 * unlike calling useSwitchOrganization() which creates separate
 * mutation instances per component.
 */
export function useIsOrgSwitching(): boolean {
  // Check if any mutations with 'SwitchOrganization' in the key are running
  const switchingCount = useIsMutating({
    mutationKey: ['SwitchOrganization'],
  });

  return switchingCount > 0;
}
