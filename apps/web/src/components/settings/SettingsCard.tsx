import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SettingsCardProps {
  /** Card title (optional) */
  title?: string;
  /** Card description (optional) */
  description?: string;
  /** Card content */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Optional footer content (e.g., action buttons) */
  footer?: ReactNode;
}

/**
 * Card-style container for settings content (Hex/Linear style)
 * Used for grouping related settings or displaying information in a card format
 *
 * @example
 * ```tsx
 * <SettingsCard
 *   title="Danger Zone"
 *   description="Irreversible actions"
 *   footer={<Button variant="destructive">Delete Workspace</Button>}
 * >
 *   <p>Content here...</p>
 * </SettingsCard>
 * ```
 */
export function SettingsCard({
  title,
  description,
  children,
  className,
  footer,
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-gray-200 bg-white',
        className
      )}
    >
      {/* Header */}
      {(title || description) && (
        <div className="border-b border-gray-200 px-6 py-4">
          {title && (
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}
