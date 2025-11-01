'use client';

import type { Document } from '@/lib/api/generated';
import { Badge } from '@olympus/ui';
import { FileText, AlertCircle, Clock } from 'lucide-react';

interface DocumentStatusBadgeProps {
  status: Document['status'] | 'uploading';
}

type DocumentStatus =
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'failed';

/**
 * Status badge component for documents.
 * Displays the current processing status with appropriate icon and color.
 */
export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const statusConfig: Record<
    DocumentStatus,
    {
      variant: 'secondary' | 'default' | 'destructive';
      label: string;
      icon: typeof FileText;
    }
  > = {
    uploading: {
      variant: 'secondary' as const,
      label: 'Uploading',
      icon: Clock,
    },
    uploaded: {
      variant: 'secondary' as const,
      label: 'Uploaded',
      icon: FileText,
    },
    processing: {
      variant: 'default' as const,
      label: 'Processing',
      icon: Clock,
    },
    processed: {
      variant: 'default' as const,
      label: 'Processed',
      icon: FileText,
    },
    failed: {
      variant: 'destructive' as const,
      label: 'Failed',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status as DocumentStatus];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
