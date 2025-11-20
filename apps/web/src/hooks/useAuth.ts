'use client';

import { useEffect } from 'react';
import {
  authApi,
  type LoginRequest,
  type RegisterRequest,
} from '@/lib/api/auth-client';
import { graphqlClient } from '@/lib/api/graphql-client';
import {
  GetOrganizationsDocument,
  type GetOrganizationsQuery,
} from '@/lib/api/hooks.generated';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth-cookies';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Organization } from '@/lib/stores/auth-store';

/**
 * Helper function to auto-select organization after login or on app mount
 * Strategy:
 * 1. If currentOrganization already exists in store (persisted), keep it
 * 2. Else if lastUsedOrganizationId exists, find and select that organization
 * 3. Else select the first organization in the list
 */
async function autoSelectOrganization(
  currentOrganization: Organization | null,
  lastUsedOrganizationId: string | null,
  setCurrentOrganization: (org: Organization | null) => void
): Promise<void> {
  // If organization already selected (from persistence), don't change it
  if (currentOrganization) {
    return;
  }

  try {
    // Fetch user's organizations
    const response: GetOrganizationsQuery = await graphqlClient.request(
      GetOrganizationsDocument,
      {
        limit: 100, // Fetch all organizations (most users have <10)
      }
    );

    const organizations = response.organizations || [];

    if (organizations.length === 0) {
      // User has no organizations - clear selection
      setCurrentOrganization(null);
      return;
    }

    // Strategy: Try to select last-used organization, fall back to first
    let selectedOrganization = organizations[0];

    if (lastUsedOrganizationId) {
      // Find the last-used organization
      const lastUsedOrg = organizations.find(
        (org) => org.id === lastUsedOrganizationId
      );

      if (lastUsedOrg) {
        selectedOrganization = lastUsedOrg;
      }
      // If last-used org not found (user removed from org), fall back to first
    }

    // Use the full organization object (GraphQL response matches Organization type)
    setCurrentOrganization(selectedOrganization as Organization);
  } catch (error) {
    console.error('Failed to auto-select organization:', error);
    // Don't throw - allow user to continue and manually select organization
  }
}

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    currentOrganization,
    lastUsedOrganizationId,
    setTokens,
    setUser,
    setLoading,
    setCurrentOrganization,
    logout: storeLogout,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken && !user) {
        try {
          setLoading(true);
          // Get user profile (auth token auto-injected via GraphQL client middleware)
          const userProfile = await authApi.me(accessToken);
          setUser(userProfile);

          // Auto-select organization after user is loaded
          await autoSelectOrganization(
            currentOrganization,
            lastUsedOrganizationId,
            setCurrentOrganization
          );
        } catch (error) {
          console.error('Failed to get user profile:', error);
          // Token might be expired, try to refresh
          if (refreshToken) {
            try {
              const tokenResponse = await authApi.refresh({
                refresh_token: refreshToken,
              });
              setTokens(
                tokenResponse.access_token,
                tokenResponse.refresh_token
              );
              // Get user profile with new token
              const userProfile = await authApi.me(tokenResponse.access_token);
              setUser(userProfile);

              // Auto-select organization after user is loaded
              await autoSelectOrganization(
                currentOrganization,
                lastUsedOrganizationId,
                setCurrentOrganization
              );
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError);
              storeLogout();
            }
          } else {
            storeLogout();
          }
        } finally {
          setLoading(false);
        }
      } else if (accessToken && user && !currentOrganization) {
        // User is already loaded, but organization is not selected
        // This can happen if user clears localStorage or switches devices
        await autoSelectOrganization(
          currentOrganization,
          lastUsedOrganizationId,
          setCurrentOrganization
        );
        setLoading(false);
      } else if (accessToken) {
        // Token exists and user is loaded
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [
    accessToken,
    refreshToken,
    user,
    currentOrganization,
    lastUsedOrganizationId,
    setTokens,
    setUser,
    setLoading,
    setCurrentOrganization,
    storeLogout,
  ]);

  const signUp = async (credentials: RegisterRequest) => {
    try {
      setLoading(true);
      // Register returns user profile, NOT tokens
      // User must verify email before logging in
      const userProfile = await authApi.register(credentials);

      // Don't set tokens - user needs to verify email first
      // Return user profile for redirect to verify-email page
      return { user: userProfile };
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      const tokenResponse = await authApi.login(credentials);
      setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
      setAuthCookies(tokenResponse.access_token, tokenResponse.refresh_token);

      // Get user profile (auth token auto-injected via GraphQL client middleware)
      const userProfile = await authApi.me(tokenResponse.access_token);
      setUser(userProfile);

      // Auto-select organization after login (uses last-used org if available)
      await autoSelectOrganization(
        currentOrganization,
        lastUsedOrganizationId,
        setCurrentOrganization
      );

      return { user: userProfile, session: tokenResponse };
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      storeLogout();
      clearAuthCookies();
    }
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const tokenResponse = await authApi.refresh({
        refresh_token: refreshToken,
      });
      setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
      // Token auto-injected via GraphQL client middleware
      return tokenResponse;
    } catch (error) {
      console.error('Token refresh failed:', error);
      storeLogout();
      throw error;
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    signUp,
    signIn,
    signOut,
    refreshAccessToken,
  };
}
