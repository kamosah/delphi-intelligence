'use client';

import {
  useOrganizationMembers,
  useRemoveOrganizationMember,
  useUpdateMemberRole,
} from '@/hooks/useOrganizationMembers';
import { OrganizationRole } from '@/lib/api/generated';
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@olympus/ui';
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Loader2, UserPlus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createOrganizationMembersColumns } from './organization-members-columns';

interface OrganizationMembersProps {
  organizationId: string;
}

export function OrganizationMembers({
  organizationId,
}: OrganizationMembersProps) {
  const { members, isLoading } = useOrganizationMembers(organizationId);
  const { removeMember } = useRemoveOrganizationMember();
  const { updateRole } = useUpdateMemberRole();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      try {
        await removeMember({
          organizationId,
          userId,
        });
        toast.success('Member removed successfully');
      } catch (error) {
        console.error('Failed to remove member:', error);
        toast.error('Failed to remove member');
      }
    },
    [organizationId, removeMember]
  );

  const handleUpdateRole = useCallback(
    async (userId: string, role: OrganizationRole) => {
      try {
        await updateRole({
          organizationId,
          userId,
          role,
        });
        toast.success('Role updated successfully');
      } catch (error) {
        console.error('Failed to update role:', error);
        toast.error('Failed to update role');
      }
    },
    [organizationId, updateRole]
  );

  const columns = useMemo(
    () =>
      createOrganizationMembersColumns(handleUpdateRole, handleRemoveMember),
    [handleUpdateRole, handleRemoveMember]
  );

  const table = useReactTable({
    data: members,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Add Member button */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter by email..."
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('email')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
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
                  className="h-24 text-center"
                >
                  No members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
