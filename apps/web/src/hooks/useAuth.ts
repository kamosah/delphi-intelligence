'use client';

import {
  authApi,
  type LoginRequest,
  type RegisterRequest,
} from '@/lib/api/auth-client';
import { setAuthToken } from '@/lib/api/graphql-client';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth-cookies';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useEffect } from 'react';

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    setTokens,
    setUser,
    setLoading,
    logout: storeLogout,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken && !user) {
        try {
          setLoading(true);
          // Set the token for GraphQL requests
          setAuthToken(accessToken);
          // Get user profile
          const userProfile = await authApi.me(accessToken);
          setUser(userProfile);
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
              setAuthToken(tokenResponse.access_token);
              // Get user profile with new token
              const userProfile = await authApi.me(tokenResponse.access_token);
              setUser(userProfile);
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
      } else if (accessToken) {
        // Token exists and user is loaded, set it for GraphQL
        setAuthToken(accessToken);
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
    setTokens,
    setUser,
    setLoading,
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
      setAuthToken(tokenResponse.access_token);
      setAuthCookies(tokenResponse.access_token, tokenResponse.refresh_token);

      // Get user profile
      const userProfile = await authApi.me(tokenResponse.access_token);
      setUser(userProfile);

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
      setAuthToken('');
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
      setAuthToken(tokenResponse.access_token);
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
