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

/**
 * Authentication state store using Zustand.
 *
 * NOTE: Tokens are now managed by Supabase HTTP-only cookies (not stored here).
 * This store only manages user data and organization state for UI reactivity.
 *
 * Auth flow:
 * - Login: Supabase sets HTTP-only cookies → update user in this store
 * - Logout: Supabase clears cookies → clear user from this store
 */
interface AuthState {
  // User state (for UI display)
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Organization state
  currentOrganization: Organization | null;

  // Actions
  setUser: (user: User) => void;
  setAuthenticated: (authenticated: boolean) => void;
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
        isAuthenticated: false,
        isLoading: false,
        currentOrganization: null,

        // Actions
        setUser: (user) =>
          set({
            user,
            isAuthenticated: true,
          }),

        setAuthenticated: (authenticated) =>
          set({ isAuthenticated: authenticated }),

        setLoading: (loading) => set({ isLoading: loading }),

        setCurrentOrganization: (organization) =>
          set({
            currentOrganization: organization,
          }),

        logout: () =>
          set({
            user: null,
            isAuthenticated: false,
            currentOrganization: null,
          }),

        clearAuth: () =>
          set({
            user: null,
            isAuthenticated: false,
            currentOrganization: null,
          }),
      }),
      {
        name: 'olympus-auth-store',
        // Only persist user data and organization (NO TOKENS)
        partialize: (state) => ({
          user: state.user,
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
