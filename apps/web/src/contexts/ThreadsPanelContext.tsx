'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ThreadsPanelContextType {
  isExpanded: boolean;
  minimize: () => void;
  expand: () => void;
  toggle: () => void;
}

const ThreadsPanelContext = createContext<ThreadsPanelContextType | null>(null);

export function ThreadsPanelProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const minimize = () => setIsExpanded(false);
  const expand = () => setIsExpanded(true);
  const toggle = () => setIsExpanded((prev) => !prev);

  return (
    <ThreadsPanelContext.Provider
      value={{ isExpanded, minimize, expand, toggle }}
    >
      {children}
    </ThreadsPanelContext.Provider>
  );
}

export function useThreadsPanel() {
  const context = useContext(ThreadsPanelContext);
  if (!context) {
    throw new Error('useThreadsPanel must be used within ThreadsPanelProvider');
  }
  return context;
}
