'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
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
 * - Animated status indicator with loading spinner
 * - Static primary blue background during streaming
 * - Smooth fade transitions between streaming and default states
 * - Animated height change when status indicator appears/disappears
 *
 * Note: Border animations should be applied to child components, not this container.
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
      className="relative rounded-md p-1.5"
    >
      {/* Status indicator - Always reserve space to prevent layout shift */}
      <motion.div
        animate={{
          opacity: isStreaming ? 1 : 0,
          height: isStreaming ? 'auto' : 0,
        }}
        initial={false}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-2 text-sm text-gray-600',
          isStreaming ? 'pb-1' : 'overflow-hidden'
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{statusText}</span>
      </motion.div>

      {/* Input container with animated border */}
      <div>{children}</div>
    </motion.div>
  );
}
