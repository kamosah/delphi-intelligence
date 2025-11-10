import { cn } from '@/lib/utils';
import { Switch } from '@olympus/ui';

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
        <label
          htmlFor={label}
          className={cn(
            'text-sm font-medium text-gray-900',
            !disabled && 'cursor-pointer'
          )}
        >
          {label}
        </label>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>

      {/* Right: Toggle switch */}
      <Switch
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
