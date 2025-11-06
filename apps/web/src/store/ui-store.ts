import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isDarkMode: boolean;
  sidebarIconMode: boolean;
  sidebarVisible: boolean;
  toggleDarkMode: () => void;
  toggleSidebarIconMode: () => void;
  setSidebarIconMode: (iconMode: boolean) => void;
  toggleSidebarVisibility: () => void;
  setSidebarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      sidebarIconMode: false,
      sidebarVisible: true,
      toggleDarkMode: () =>
        set((state) => {
          const newMode = !state.isDarkMode;
          // Update document class for dark mode
          if (typeof window !== 'undefined') {
            if (newMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { isDarkMode: newMode };
        }),
      toggleSidebarIconMode: () =>
        set((state) => ({ sidebarIconMode: !state.sidebarIconMode })),
      setSidebarIconMode: (iconMode: boolean) =>
        set({ sidebarIconMode: iconMode }),
      toggleSidebarVisibility: () =>
        set((state) => ({ sidebarVisible: !state.sidebarVisible })),
      setSidebarVisible: (visible: boolean) => set({ sidebarVisible: visible }),
    }),
    {
      name: 'ui-storage',
      onRehydrateStorage: () => (state) => {
        // Apply dark mode on hydration
        if (state?.isDarkMode && typeof window !== 'undefined') {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
