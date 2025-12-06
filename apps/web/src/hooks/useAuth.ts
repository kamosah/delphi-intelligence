'use client';

import { useEffect } from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  authApi,
  type LoginRequest,
  type RegisterRequest,
} from '@/lib/api/auth-client';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth-cookies';
import { useAuthStore } from '@/lib/stores/auth-store';

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    currentOrganization,
    setTokens,
    setUser,
    setLoading,
    setCurrentOrganization,
    logout: storeLogout,
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

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Nothing to do if no token or user already loaded
      if (!accessToken || user) {
        setLoading(false);
        return;
      }

      // Token exists but no user - fetch user profile
      try {
        setLoading(true);
        const userProfile = await authApi.me(accessToken);
        setUser(userProfile);
        // Organization will auto-sync via useOrganizations + effect above
      } catch (error) {
        console.error('Failed to get user profile:', error);

        // Token might be expired - try to refresh if we have refresh token
        if (refreshToken) {
          try {
            const tokenResponse = await authApi.refresh({
              refresh_token: refreshToken,
            });
            setTokens(tokenResponse.access_token, tokenResponse.refresh_token);

            // Retry fetching user profile with new token
            const userProfile = await authApi.me(tokenResponse.access_token);
            setUser(userProfile);
            // Organization will auto-sync via useOrganizations + effect above
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            storeLogout();
          }
        } else {
          // No refresh token - logout
          storeLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    // Only depend on state values, not action functions (they're stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, refreshToken, user]);

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

      // Organization will auto-sync via useOrganizations + effect above

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
