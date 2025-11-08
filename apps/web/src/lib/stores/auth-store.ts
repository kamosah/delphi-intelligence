import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  email_confirmed?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId?: string | null;
  memberCount: number;
  spaceCount: number;
  threadCount: number;
}

interface AuthState {
  // Authentication state
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Organization state
  currentOrganization: Organization | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setCurrentOrganization: (organization: Organization | null) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        currentOrganization: null,

        // Actions
        setTokens: (accessToken, refreshToken) =>
          set({
            accessToken,
            refreshToken,
            isAuthenticated: true,
          }),

        setUser: (user) => set({ user }),

        setLoading: (loading) => set({ isLoading: loading }),

        setCurrentOrganization: (organization) =>
          set({ currentOrganization: organization }),

        logout: () =>
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            currentOrganization: null,
          }),

        clearAuth: () =>
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            currentOrganization: null,
          }),
      }),
      {
        name: 'olympus-auth-store',
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
          currentOrganization: state.currentOrganization,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
