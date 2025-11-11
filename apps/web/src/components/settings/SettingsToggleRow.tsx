import { cn } from '@/lib/utils';
import { Skeleton, Switch } from '@olympus/ui';

interface SettingsToggleRowProps {
  /** Settings label (e.g., "Display full names", "Convert text emoticons") */
  label: string;
  /** Optional description text below the label */
  description?: string;
  /** Whether the toggle is checked */
  checked: boolean;
  /** Callback when toggle state changes */
  onCheckedChange: (checked: boolean) => void;
  /** Whether the row is disabled */
  disabled?: boolean;
  /** Optional className for custom styling */
  className?: string;
  /** Whether to show loading skeleton */
  loading?: boolean;
}

/**
 * Settings row with integrated toggle switch (Linear/Hex style)
 * Used for boolean settings that can be toggled on/off
 *
 * @example
 * ```tsx
 * <SettingsToggleRow
 *   label="Display full names"
 *   description="Show full names instead of usernames"
 *   checked={displayFullNames}
 *   onCheckedChange={setDisplayFullNames}
 * />
 * ```
 */
export function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  loading = false,
}: SettingsToggleRowProps) {
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
        {loading ? (
          <>
            <Skeleton className="h-4 w-40" />
            {description && <Skeleton className="h-3 w-80" />}
          </>
        ) : (
          <>
            <label
              htmlFor={label}
              className={cn(
                'text-sm font-medium text-gray-900',
                !disabled && 'cursor-pointer'
              )}
            >
              {label}
            </label>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </>
        )}
      </div>

      {/* Right: Toggle switch */}
      {loading ? (
        <Skeleton className="h-6 w-11 rounded-full" />
      ) : (
        <Switch
          id={label}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
