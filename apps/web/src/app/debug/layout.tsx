import { DebugNav } from '@/components/debug/DebugNav';

/**
 * Debug layout - enables full page scrolling for debug pages
 * Overrides root layout's overflow-hidden constraint
 */
export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <DebugNav />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
