import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { Button, Checkbox, Badge } from '@olympus/ui';
import type { Document } from '@/lib/api/generated';
import { DocumentTableRowActions } from './document-table-row-actions';
import { DocumentIcon } from './DocumentIcon';
import { DocumentStatusBadge } from './DocumentStatusBadge';

type DocumentWithSpace = Document & {
  space?: { id: string; name: string };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Create column definitions for DocumentTable
 *
 * @param showSpaceColumn - Whether to show the Space column (false for /spaces/:id, true for /documents)
 * @param onDelete - Callback to delete a document
 * @param onDownload - Callback to download a document
 * @returns Array of column definitions for TanStack Table
 */
export function createDocumentTableColumns(
  showSpaceColumn: boolean,
  onDelete: (documentId: string) => Promise<void>,
  onDownload: (documentId: string) => Promise<void>
): ColumnDef<DocumentWithSpace>[] {
  const columns: ColumnDef<DocumentWithSpace>[] = [
    // Checkbox
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // Type (icon only, sortable)
    {
      accessorKey: 'fileType',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <DocumentIcon fileType={row.original.fileType} variant="icon-only" />
        </div>
      ),
      size: 60,
    },

    // Name (text only)
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 truncate">
          {row.original.name}
        </span>
      ),
    },
  ];

  // Conditionally add Space column
  if (showSpaceColumn) {
    columns.push({
      id: 'space',
      accessorKey: 'space.name',
      header: 'Space',
      cell: ({ row }) => {
        const space = row.original.space;
        return space ? (
          <Badge className="bg-blue-100 text-blue-700">{space.name}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    });
  }

  // Folder (placeholder)
  columns.push({
    id: 'folder',
    header: 'Folder',
    cell: () => <span className="text-gray-400">—</span>,
  });

  // Size
  columns.push({
    accessorKey: 'sizeBytes',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Size
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">
        {formatBytes(row.getValue('sizeBytes'))}
      </span>
    ),
  });

  // Uploaded
  columns.push({
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Uploaded
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string;
      return (
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(date), { addSuffix: true })}
        </span>
      );
    },
  });

  // Status
  columns.push({
    accessorKey: 'status',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <DocumentStatusBadge status={row.getValue('status')} />,
  });

  // Actions
  columns.push({
    id: 'actions',
    cell: ({ row }) => (
      <DocumentTableRowActions
        document={row.original}
        onDelete={onDelete}
        onDownload={onDownload}
      />
    ),
  });

  return columns;
}
