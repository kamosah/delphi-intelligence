import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface AppState {
  // UI State
  theme: 'light' | 'dark' | 'system';
  isLoading: boolean;

  // Current selections
  currentSpaceId: string | null;
  currentDocumentId: string | null;

  // Notifications
  notifications: Notification[];

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLoading: (loading: boolean) => void;
  setCurrentSpace: (spaceId: string | null) => void;
  setCurrentDocument: (documentId: string | null) => void;
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'system',
        isLoading: false,
        currentSpaceId: null,
        currentDocumentId: null,
        notifications: [],

        // Actions
        setTheme: (theme) => set({ theme }),

        setLoading: (isLoading) => set({ isLoading }),

        setCurrentSpace: (currentSpaceId) => set({ currentSpaceId }),

        setCurrentDocument: (currentDocumentId) => set({ currentDocumentId }),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [
              {
                ...notification,
                id: Date.now().toString(),
                timestamp: Date.now(),
                read: false,
              },
              ...state.notifications,
            ],
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),

        markNotificationAsRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          })),

        clearAllNotifications: () => set({ notifications: [] }),
      }),
      {
        name: 'olympus-app-storage',
        partialize: (state) => ({
          theme: state.theme,
          currentSpaceId: state.currentSpaceId,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
);
