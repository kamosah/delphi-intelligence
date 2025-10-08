'use client';

import { useAppStore, useAuthStore } from '@/lib/stores';

export default function StateExample() {
  // App store (client state)
  const {
    sidebarOpen,
    theme,
    currentSpaceId,
    notifications,
    toggleSidebar,
    setTheme,
    setCurrentSpace,
    addNotification,
  } = useAppStore();

  // Auth store
  const { user, isAuthenticated, setUser, logout } = useAuthStore();

  const handleLogin = () => {
    // Simulate login
    setUser({
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleAddNotification = () => {
    addNotification({
      type: 'success',
      title: 'Welcome!',
      message: 'State management is working with Zustand + React Query!',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">New State Management Demo</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">App State (Zustand)</h3>
          <div className="space-y-2">
            <p>Sidebar Open: {sidebarOpen ? 'Yes' : 'No'}</p>
            <p>Theme: {theme}</p>
            <p>Current Space: {currentSpaceId || 'None'}</p>
            <p>Notifications: {notifications.length}</p>
          </div>

          <div className="mt-4 space-x-2">
            <button
              onClick={toggleSidebar}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Toggle Sidebar
            </button>

            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Toggle Theme
            </button>

            <button
              onClick={() => setCurrentSpace('space-1')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Set Space
            </button>

            <button
              onClick={handleAddNotification}
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
            >
              Add Notification
            </button>
          </div>
        </div>

        {/* Auth State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Auth State (Zustand)</h3>
          <div className="space-y-2">
            <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
            {user && (
              <>
                <p>User: {user.name || user.email}</p>
                <p>ID: {user.id}</p>
              </>
            )}
          </div>

          <div className="mt-4 space-x-2">
            {!isAuthenticated ? (
              <button
                onClick={handleLogin}
                className="px-3 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
              >
                Login
              </button>
            ) : (
              <button
                onClick={logout}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* React Query Demo */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">React Query</h3>
        <p className="text-gray-600">
          React Query is set up and ready! Server state queries will be
          implemented when we start building API endpoints for spaces,
          documents, and queries.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Check the React Query DevTools in the bottom-left corner (development
          only).
        </p>
      </div>

      {/* Architecture Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Architecture Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700">
              Client State (Zustand)
            </h4>
            <ul className="list-disc list-inside text-gray-600 mt-1">
              <li>UI state (sidebar, theme)</li>
              <li>Navigation state</li>
              <li>Notifications</li>
              <li>Authentication state</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700">
              Server State (React Query)
            </h4>
            <ul className="list-disc list-inside text-gray-600 mt-1">
              <li>API data caching</li>
              <li>Background refetching</li>
              <li>Optimistic updates</li>
              <li>Error handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
