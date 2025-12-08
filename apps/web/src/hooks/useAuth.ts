'use client';

import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuthStore, type User } from '@/lib/stores/auth-store';

/**
 * Authentication hook with user data sync from GraphQL.
 *
 * This hook syncs user data from GraphQL `me` query to Zustand:
 * - Fetches user profile via useCurrentUser (GraphQL)
 * - Syncs user and organization to Zustand store
 * - Provides isAuthenticated flag for UI
 *
 * Auth operations use Supabase directly:
 * - Login: Use Supabase signInWithPassword() in LoginForm
 * - Logout: Use Supabase signOut() in UserMenu
 * - Tokens: Managed by Supabase HTTP-only cookies (not exposed to JavaScript)
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    currentOrganization,
    setUser,
    setAuthenticated,
    setCurrentOrganization,
    clearAuth,
  } = useAuthStore();

  // Fetch user data from GraphQL me query
  const { user: graphqlUser, isLoading: isUserLoading } = useCurrentUser();

  // Fetch organizations and compute current org (only when authenticated)
  const { currentOrganization: computedCurrentOrg } = useOrganizations();

  // Sync GraphQL user to Zustand
  useEffect(() => {
    if (graphqlUser) {
      // Map GraphQL User to Zustand User type
      const userData: User = {
        id: graphqlUser.id,
        email: graphqlUser.email,
        full_name: graphqlUser.fullName || undefined,
        role: graphqlUser.role,
        is_active: graphqlUser.isActive,
        avatar_url: graphqlUser.avatarUrl || undefined,
        email_confirmed: graphqlUser.emailConfirmed,
      };

      setUser(userData);
      setAuthenticated(true);
    } else if (!isUserLoading) {
      // User query completed but no user found - clear auth
      if (isAuthenticated) {
        clearAuth();
      }
    }
  }, [
    graphqlUser,
    isUserLoading,
    isAuthenticated,
    setUser,
    setAuthenticated,
    clearAuth,
  ]);

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
    isLoading: isLoading || isUserLoading,
    currentOrganization,
    setCurrentOrganization,
  };
}
