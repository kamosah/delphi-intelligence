'use client';

import { FileImage, FileSpreadsheet, FileText, File } from 'lucide-react';

interface DocumentIconProps {
  fileType?: string;
  variant?: 'default' | 'icon-only';
}

/**
 * Get icon and color scheme based on file type
 */
function getFileTypeStyles(fileType?: string) {
  const type = fileType?.toLowerCase() || '';

  // PDFs
  if (type.includes('pdf')) {
    return {
      icon: FileText,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
    };
  }

  // Images
  if (
    type.includes('image') ||
    type.includes('png') ||
    type.includes('jpg') ||
    type.includes('jpeg') ||
    type.includes('gif') ||
    type.includes('webp')
  ) {
    return {
      icon: FileImage,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    };
  }

  // Spreadsheets
  if (
    type.includes('sheet') ||
    type.includes('excel') ||
    type.includes('csv') ||
    type.includes('xls')
  ) {
    return {
      icon: FileSpreadsheet,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    };
  }

  // Text documents (Word, plain text, etc.)
  if (
    type.includes('document') ||
    type.includes('word') ||
    type.includes('doc') ||
    type.includes('text') ||
    type.includes('txt')
  ) {
    return {
      icon: FileText,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    };
  }

  // Default
  return {
    icon: File,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
  };
}

/**
 * Document icon component.
 * Displays a file icon with file type specific styling.
 *
 * @param variant - 'default' shows icon with background, 'icon-only' shows just the icon
 */
export function DocumentIcon({
  fileType,
  variant = 'default',
}: DocumentIconProps) {
  const { icon: Icon, bgColor, iconColor } = getFileTypeStyles(fileType);

  if (variant === 'icon-only') {
    return <Icon className={`w-5 h-5 ${iconColor}`} />;
  }

  return (
    <div
      className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}
    >
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
  );
}
