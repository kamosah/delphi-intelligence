'use client';

import { FileText } from 'lucide-react';

interface DocumentIconProps {
  fileType?: string;
}

/**
 * Document icon component.
 * Displays a file icon with optional file type specific styling.
 */
export function DocumentIcon({ fileType }: DocumentIconProps) {
  return (
    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
      <FileText className="w-5 h-5 text-blue-600" />
    </div>
  );
}
