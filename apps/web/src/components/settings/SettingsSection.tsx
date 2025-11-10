import { cn } from '@/lib/utils';
import { Separator } from '@olympus/ui';
import type { ReactNode } from 'react';

interface SettingsSectionProps {
  /** Section title (e.g., "General", "Time & region") */
  title?: string;
  /** Optional section description */
  description?: string;
  /** Section content (SettingsRow components) */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Settings section with optional title and grouped rows
 * Used to organize related settings together (Linear/Hex style)
 *
 * @example
 * ```tsx
 * <SettingsSection title="General" description="Basic preferences">
 *   <SettingsRow label="Theme" description="Choose your theme">
 *     <Select />
 *   </SettingsRow>
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {children}
      </div>
    </div>
  );
}

interface SettingsSectionDividerProps {
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Divider between settings rows within a section
 *
 * @example
 * ```tsx
 * <SettingsSection>
 *   <SettingsRow>...</SettingsRow>
 *   <SettingsSectionDivider />
 *   <SettingsRow>...</SettingsRow>
 * </SettingsSection>
 * ```
 */
export function SettingsSectionDivider({
  className,
}: SettingsSectionDividerProps) {
  return <Separator className={cn('bg-gray-100', className)} />;
}
