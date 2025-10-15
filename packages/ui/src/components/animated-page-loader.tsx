'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

interface AnimatedPageLoaderProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export function AnimatedPageLoader({
  title = 'Loading Olympus...',
  description,
  icon,
}: AnimatedPageLoaderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-agent-primary/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{
            rotate: icon ? 0 : 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {icon || <Sparkles className="h-16 w-16 text-primary" />}
        </motion.div>
        <div className="flex flex-col items-center gap-2 text-center">
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-sm font-medium text-foreground"
          >
            {title}
          </motion.p>
          {description && (
            <motion.p
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="text-xs text-muted-foreground max-w-xs"
            >
              {description}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
