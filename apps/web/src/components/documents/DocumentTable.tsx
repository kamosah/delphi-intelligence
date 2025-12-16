'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@olympus/ui';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useDocuments,
  useDeleteDocument,
  useDownloadDocument,
  useBulkDeleteDocuments,
} from '@/hooks/useDocuments';
import { DocumentSortField, SortOrder } from '@/lib/api/generated';
import { createDocumentTableColumns } from './document-table-columns';
import { DocumentTableFilters } from './document-table-filters';

interface DocumentTableProps {
  spaceId?: string;
  organizationId?: string;
  showSpaceColumn?: boolean;
}

export function DocumentTable({
  spaceId,
  organizationId,
  showSpaceColumn = false,
}: DocumentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Filter state (server-side)
  const [searchValue, setSearchValue] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [fileTypeFilters, setFileTypeFilters] = useState<string[]>([]);

  // Debounce search to reduce API calls (300ms delay)
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // Map TanStack Table sorting to GraphQL sort format
  const graphqlSort = useMemo(() => {
    if (sorting.length === 0) return undefined;
    const sort = sorting[0];
    const fieldMap: Record<string, DocumentSortField> = {
      name: DocumentSortField.Name,
      sizeBytes: DocumentSortField.Size,
      createdAt: DocumentSortField.CreatedAt,
      updatedAt: DocumentSortField.UpdatedAt,
      status: DocumentSortField.Status,
      fileType: DocumentSortField.FileType,
    };
    return {
      field: fieldMap[sort.id] || DocumentSortField.CreatedAt,
      order: sort.desc ? SortOrder.Desc : SortOrder.Asc,
    };
  }, [sorting]);

  // Map filter state to GraphQL filters (use debounced search value)
  const graphqlFilters = useMemo(() => {
    const filters: {
      search?: string;
      statuses?: string[];
      fileTypes?: string[];
    } = {};
    if (debouncedSearchValue) filters.search = debouncedSearchValue;
    if (statusFilters.length > 0) filters.statuses = statusFilters;
    if (fileTypeFilters.length > 0) filters.fileTypes = fileTypeFilters;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [debouncedSearchValue, statusFilters, fileTypeFilters]);

  // Use server-side filtering and sorting via GraphQL
  const { documents, isFetching } = useDocuments({
    spaceId,
    organizationId,
    filters: graphqlFilters,
    sort: graphqlSort,
  });
  const { deleteDocument, isDeleting } = useDeleteDocument();
  const { downloadDocument } = useDownloadDocument();
  const { bulkDeleteDocuments } = useBulkDeleteDocuments();

  const handleDelete = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocument({ documentId, spaceId: spaceId || '' });
        toast.success('Document deleted');
      } catch (error) {
        console.error('Failed to delete document:', error);
        toast.error('Failed to delete document');
      }
    },
    [deleteDocument, spaceId]
  );

  const handleDownload = useCallback(
    async (documentId: string) => {
      const document = documents.find((doc) => doc.id === documentId);
      if (document) {
        try {
          await downloadDocument({ documentId, fileName: document.name });
          toast.success('Download started');
        } catch (error) {
          console.error('Failed to download document:', error);
          toast.error('Failed to download document');
        }
      }
    },
    [documents, downloadDocument]
  );

  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    try {
      const result = await bulkDeleteDocuments({ documentIds: selectedIds });
      const successCount = result.bulkDeleteDocuments.deletedCount;
      const failedCount = result.bulkDeleteDocuments.failedIds.length;

      if (failedCount === 0) {
        toast.success(`${successCount} documents deleted`);
      } else {
        toast.warning(
          `${successCount} documents deleted, ${failedCount} failed`
        );
      }

      setRowSelection({});
    } catch (error) {
      console.error('Failed to delete documents:', error);
      toast.error('Failed to delete documents');
    }
  }, [rowSelection, bulkDeleteDocuments]);

  const columns = useMemo(
    () =>
      createDocumentTableColumns(showSpaceColumn, handleDelete, handleDownload),
    [showSpaceColumn, handleDelete, handleDownload]
  );

  const table = useReactTable({
    data: documents,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true, // Server-side sorting
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DocumentTableFilters
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusFilters={statusFilters}
          onStatusFilterChange={setStatusFilters}
          fileTypeFilters={fileTypeFilters}
          onFileTypeFilterChange={setFileTypeFilters}
        />

        {selectedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete {selectedCount}
          </Button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="relative">
            {/* Linear progress indicator - shows when fetching data */}
            {isFetching && (
              <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-gray-100">
                <div className="h-full w-1/4 animate-progress bg-blue-500" />
              </div>
            )}
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  {isFetching ? 'Loading documents...' : 'No documents found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          {selectedCount > 0
            ? `${selectedCount} of ${documents.length} selected`
            : `${documents.length} document${documents.length === 1 ? '' : 's'}`}
        </div>
      </div>
    </div>
  );
}
