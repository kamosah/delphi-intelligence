'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@olympus/ui';

interface StreamingContainerProps {
  isStreaming: boolean;
  statusText: string;
  children: ReactNode;
}

/**
 * StreamingContainer - Composable wrapper for input components with streaming state.
 *
 * Features:
 * - Animated status indicator with gradient background
 * - Animated border with blue-purple gradient during streaming
 * - Seamless visual connection between status and input
 * - Framer Motion animations for smooth transitions
 *
 * @example
 * <StreamingContainer isStreaming={isStreaming} statusText="Searching documents...">
 *   <TipTapEditor />
 * </StreamingContainer>
 */
export function StreamingContainer({
  isStreaming,
  statusText,
  children,
}: StreamingContainerProps) {
  return (
    <motion.div
      animate={{
        backgroundColor: isStreaming
          ? 'rgba(59, 130, 246, 0.1)'
          : 'transparent',
      }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
      className={cn('relative rounded-md', isStreaming ? 'p-1.5' : '')}
    >
      {/* Status indicator during streaming */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-sm text-gray-600 pb-1"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{statusText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container with animated border */}
      <div>{children}</div>
    </motion.div>
  );
}
