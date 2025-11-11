'use client';

/**
 * Spaces layout - provides consistent padding for all space-related pages.
 * Inherits AppHeader and AppSidebar from parent dashboard layout.
 * Uses p-8 for padding which naturally extends with content for proper scrolling.
 */
export default function SpacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
