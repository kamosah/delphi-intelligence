'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface SpaceContextValue {
  spaceId: string;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

interface SpaceProviderProps {
  spaceId: string;
  children: ReactNode;
}

/**
 * SpaceProvider - Provides space context to all child components
 *
 * Wraps the space-level pages to provide spaceId without prop drilling.
 * Used by ThreadInterface, ThreadsPanel, DatabaseSelector, and other
 * components that need to know which space they're operating in.
 *
 * @example
 * <SpaceProvider spaceId={params.id}>
 *   <ThreadInterface />
 * </SpaceProvider>
 */
export function SpaceProvider({ spaceId, children }: SpaceProviderProps) {
  return (
    <SpaceContext.Provider value={{ spaceId }}>
      {children}
    </SpaceContext.Provider>
  );
}

/**
 * useSpace - Hook to access the current space context
 *
 * @throws Error if used outside of SpaceProvider
 *
 * @example
 * function MyComponent() {
 *   const { spaceId } = useSpace();
 *   // Use spaceId...
 * }
 */
export function useSpace() {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error('useSpace must be used within SpaceProvider');
  }
  return context;
}
