import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SettingsInfoItem {
  /** Item label (e.g., "Created", "Members") */
  label: string;
  /** Item value (can be string, number, or custom React node) */
  value: ReactNode;
}

interface SettingsInfoCardProps {
  /** Card title (optional) */
  title?: string;
  /** Card description (optional) */
  description?: string;
  /** Array of info items to display */
  items: SettingsInfoItem[];
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Display-only information card for showing read-only data (Hex/Linear style)
 * Used for displaying workspace info, subscription details, user profile, etc.
 *
 * @example
 * ```tsx
 * <SettingsInfoCard
 *   title="Workspace Information"
 *   items={[
 *     { label: "Created", value: "Jan 15, 2024" },
 *     { label: "Members", value: "12" },
 *     { label: "Plan", value: <Badge>Pro</Badge> }
 *   ]}
 * />
 * ```
 */
export function SettingsInfoCard({
  title,
  description,
  items,
  className,
}: SettingsInfoCardProps) {
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

      {/* Info items */}
      <div className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-6 py-4"
          >
            <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
            <dd className="text-sm text-gray-900">{item.value}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}
