'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@olympus/ui';
import { FileText } from 'lucide-react';

interface DocumentListEmptyProps {
  message?: string;
}

/**
 * Empty state component for DocumentList.
 * Displays when no documents have been uploaded to a space.
 */
export function DocumentListEmpty({
  message = 'No documents uploaded yet',
}: DocumentListEmptyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            No documents yet
          </p>
          <p className="text-sm text-gray-500">
            Upload documents using the form above to get started.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
