import { MoreHorizontal, Download, Trash2, Eye } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@olympus/ui';
import type { GetDocumentsQuery } from '@/lib/api/hooks.generated';

// Extract the document type from the GraphQL query result
type DocumentFromQuery = NonNullable<GetDocumentsQuery['documents']>[number];

interface DocumentTableRowActionsProps {
  document: DocumentFromQuery;
  onDelete: (documentId: string) => Promise<void>;
  onDownload: (documentId: string) => Promise<void>;
}

export function DocumentTableRowActions({
  document,
  onDelete,
  onDownload,
}: DocumentTableRowActionsProps) {
  const canDownload =
    document.status === 'processed' || document.status === 'uploaded';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem
          onClick={() => onDownload(document.id)}
          disabled={!canDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`/documents/${document.id}`, '_blank')}
        >
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(document.id)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
