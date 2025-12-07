'use client';

import { useEffect } from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Simplified authentication hook (Supabase SSR).
 *
 * DEPRECATED: Most auth operations now use Supabase directly:
 * - Login: Use Supabase signInWithPassword() in LoginForm
 * - Logout: Use Supabase signOut() in UserMenu
 * - Tokens: Managed by Supabase HTTP-only cookies (not exposed to JavaScript)
 *
 * This hook now only provides:
 * - User data for UI display
 * - Organization state
 * - isAuthenticated flag
 *
 * Compatibility: Kept for existing code that uses useAuth().user or useAuth().isAuthenticated
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    currentOrganization,
    setCurrentOrganization,
  } = useAuthStore();

  // Fetch organizations and compute current org (only when authenticated)
  const { currentOrganization: computedCurrentOrg } = useOrganizations();

  // Sync computed current org to Zustand
  useEffect(() => {
    if (
      computedCurrentOrg &&
      computedCurrentOrg.id !== currentOrganization?.id
    ) {
      setCurrentOrganization(computedCurrentOrg);
    }
  }, [computedCurrentOrg, currentOrganization, setCurrentOrganization]);

  return {
    user,
    isAuthenticated,
    isLoading,
    currentOrganization,
    setCurrentOrganization,
  };
}
