'use client';

import { AlertCircle } from 'lucide-react';

interface DocumentErrorProps {
  error: string;
}

/**
 * Error message component for failed document processing.
 * Displays processing error details.
 */
export function DocumentError({ error }: DocumentErrorProps) {
  return (
    <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}
