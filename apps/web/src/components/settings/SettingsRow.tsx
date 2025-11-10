import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SettingsRowProps {
  /** Settings label (e.g., "Display name", "Email") */
  label: string;
  /** Optional description text below the label */
  description?: string;
  /** Content slot for input, toggle, select, or other controls */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Whether the row is disabled */
  disabled?: boolean;
}

/**
 * Base settings row component with label/description and action slot
 * Used for form inputs, toggles, selects, and custom controls (Linear/Hex style)
 *
 * @example
 * ```tsx
 * <SettingsRow label="Theme" description="Choose your preferred theme">
 *   <Select>...</Select>
 * </SettingsRow>
 * ```
 */
export function SettingsRow({
  label,
  description,
  children,
  className,
  disabled = false,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-8 px-6 py-4',
        'hover:bg-gray-50 transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Left: Label and description */}
      <div className="flex-1 space-y-1">
        <label
          className={cn(
            'text-sm font-medium text-gray-900',
            disabled && 'cursor-not-allowed'
          )}
        >
          {label}
        </label>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>

      {/* Right: Action slot */}
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
