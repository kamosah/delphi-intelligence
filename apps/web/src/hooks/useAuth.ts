'use client';

import { useEffect } from 'react';
import { useAutoSelectOrganization } from '@/hooks/useUserPreferences';
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
    setOrgSynced,
    logout: storeLogout,
  } = useAuthStore();

  // Use React Query-based organization auto-selection
  const autoSelectOrganization = useAutoSelectOrganization();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken && !user) {
        try {
          setLoading(true);
          // Clear sync flag until we verify with backend
          setOrgSynced(false);

          // Get user profile (auth token auto-injected via GraphQL client middleware)
          const userProfile = await authApi.me(accessToken);
          setUser(userProfile);

          // Auto-select organization after user is loaded
          // This will set isOrgSynced to true on completion
          await autoSelectOrganization();
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
              await autoSelectOrganization();
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
        await autoSelectOrganization();
        setLoading(false);
      } else if (accessToken) {
        // Token exists and user is loaded
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
    // Only depend on state values, not action functions (they're stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, refreshToken, user, currentOrganization]);

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
      // Clear sync flag until we verify with backend
      setOrgSynced(false);

      const tokenResponse = await authApi.login(credentials);
      setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
      setAuthCookies(tokenResponse.access_token, tokenResponse.refresh_token);

      // Get user profile (auth token auto-injected via GraphQL client middleware)
      const userProfile = await authApi.me(tokenResponse.access_token);
      setUser(userProfile);

      // Auto-select organization after login (uses backend preference)
      // This will set isOrgSynced to true on completion
      await autoSelectOrganization();

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
