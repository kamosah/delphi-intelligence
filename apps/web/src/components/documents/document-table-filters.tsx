import { Search, Filter } from 'lucide-react';
import {
  Input,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@olympus/ui';

const STATUS_OPTIONS = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'processing', label: 'Processing' },
  { value: 'processed', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
];

const FILE_TYPE_OPTIONS = [
  { value: 'application/pdf', label: 'PDF' },
  {
    value:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
  },
  { value: 'text/plain', label: 'Text' },
  { value: 'text/markdown', label: 'Markdown' },
];

interface DocumentTableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilters: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  fileTypeFilters: string[];
  onFileTypeFilterChange: (fileTypes: string[]) => void;
}

export function DocumentTableFilters({
  searchValue,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
  fileTypeFilters,
  onFileTypeFilterChange,
}: DocumentTableFiltersProps) {
  const activeFilterCount = statusFilters.length + fileTypeFilters.length;

  const toggleStatus = (status: string) => {
    if (statusFilters.includes(status)) {
      onStatusFilterChange(statusFilters.filter((s) => s !== status));
    } else {
      onStatusFilterChange([...statusFilters, status]);
    }
  };

  const toggleFileType = (fileType: string) => {
    if (fileTypeFilters.includes(fileType)) {
      onFileTypeFilterChange(fileTypeFilters.filter((t) => t !== fileType));
    } else {
      onFileTypeFilterChange([...fileTypeFilters, fileType]);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search documents..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {STATUS_OPTIONS.map((status) => (
            <DropdownMenuCheckboxItem
              key={status.value}
              checked={statusFilters.includes(status.value)}
              onCheckedChange={() => toggleStatus(status.value)}
            >
              {status.label}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuLabel>File Type</DropdownMenuLabel>
          {FILE_TYPE_OPTIONS.map((fileType) => (
            <DropdownMenuCheckboxItem
              key={fileType.value}
              checked={fileTypeFilters.includes(fileType.value)}
              onCheckedChange={() => toggleFileType(fileType.value)}
            >
              {fileType.label}
            </DropdownMenuCheckboxItem>
          ))}

          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onStatusFilterChange([]);
                  onFileTypeFilterChange([]);
                }}
              >
                Clear filters
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
