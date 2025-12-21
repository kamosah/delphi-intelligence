'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '../lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

interface LinearProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the progress bar is currently active/visible
   * @default true
   */
  active?: boolean;
}

/**
 * Linear indeterminate progress indicator for loading states.
 * Shows an animated sweeping bar to indicate ongoing activity.
 *
 * Designed for use in tables, cards, and other components where a subtle
 * loading indicator is needed without blocking the entire view.
 *
 * @example
 * // Basic usage
 * <LinearProgress active={isFetching} />
 *
 * @example
 * // Custom styling (thinner bar)
 * <LinearProgress active={isLoading} className="h-0.5" />
 *
 * @example
 * // In a table header (between TableHeader and TableBody)
 * <Table>
 *   <TableHeader>...</TableHeader>
 *   <LinearProgress active={isFetching} />
 *   <TableBody>...</TableBody>
 * </Table>
 */
const LinearProgress = React.forwardRef<HTMLDivElement, LinearProgressProps>(
  ({ className, active = true, ...props }, ref) => {
    if (!active) return null;

    return (
      <div
        ref={ref}
        className={cn('h-1 w-full overflow-hidden bg-gray-100', className)}
        role="progressbar"
        aria-valuetext="Loading"
        {...props}
      >
        <div className="h-full w-1/4 animate-progress bg-blue-500" />
      </div>
    );
  }
);
LinearProgress.displayName = 'LinearProgress';

export { Progress, LinearProgress };
