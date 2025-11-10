# Table Component Patterns & Best Practices

This guide establishes conventions for organizing TanStack Table components in the Olympus project, based on industry standards from shadcn/ui, TanStack Table documentation, and Next.js best practices.

## Quick Reference

| File Type                  | Naming Convention           | Location                | Example                                |
| -------------------------- | --------------------------- | ----------------------- | -------------------------------------- |
| Column definitions         | `[feature]-columns.tsx`     | `components/[feature]/` | `organization-members-columns.tsx`     |
| Table component            | `[Feature].tsx`             | `components/[feature]/` | `OrganizationMembers.tsx`              |
| Row actions (if extracted) | `[feature]-row-actions.tsx` | `components/[feature]/` | `organization-members-row-actions.tsx` |
| Toolbar/filters            | `[feature]-toolbar.tsx`     | `components/[feature]/` | `organization-members-toolbar.tsx`     |
| Shared table primitives    | `table.tsx`                 | `packages/ui/`          | `table.tsx`                            |
| Generic DataTable          | `data-table.tsx`            | `packages/ui/`          | `data-table.tsx`                       |
| Shared utilities           | `data-table-*.tsx`          | `packages/ui/`          | `data-table-pagination.tsx`            |

## Naming Conventions

### File Naming: Hybrid Approach

We use a **hybrid naming convention** that provides semantic clarity:

#### PascalCase for React Components

```
OrganizationMembers.tsx          ✅ Main table component
CreateOrganizationDialog.tsx     ✅ Dialog component
DocumentList.tsx                 ✅ Feature component
```

**Rationale:**

- Standard React convention
- File name matches primary export
- Clear that it's a component file

#### kebab-case for Configuration/Utility Files

```
organization-members-columns.tsx     ✅ Column definitions
document-list-columns.tsx            ✅ Column definitions
organization-members-row-actions.tsx ✅ Extracted row actions
data-table-toolbar.tsx               ✅ Shared utility
```

**Rationale:**

- Industry standard from shadcn/ui
- Cross-platform file system safety
- Clear distinction from component files
- Aligns with Next.js routing conventions

### Why This Hybrid Approach?

**Semantic clarity**: The naming convention itself tells you what the file contains:

- `OrganizationMembers.tsx` → React component
- `organization-members-columns.tsx` → Column configuration

**Industry alignment**: Matches shadcn/ui patterns (the most popular implementation of TanStack Table in React)

**Practical benefits**: Avoids case-sensitivity issues on different operating systems

## File Organization Patterns

### Level 1: Design System Primitives (packages/ui)

Basic table elements with styling:

```tsx
// packages/ui/src/components/table.tsx
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

**Purpose:** Visual presentation primitives
**Responsibility:** Styling and HTML structure
**Reusability:** Maximum - used by all tables

### Level 2: Shared Table Utilities (packages/ui)

Reusable table functionality used across features:

```
packages/ui/src/components/
├── table.tsx                        # Primitives (current)
├── data-table.tsx                   # Generic DataTable component (future)
├── data-table-pagination.tsx        # Shared pagination (future)
├── data-table-toolbar.tsx           # Shared toolbar with filters (future)
├── data-table-column-header.tsx     # Sortable headers (future)
└── data-table-view-options.tsx      # Column visibility toggle (future)
```

### Level 3: Feature-Specific Components (apps/web)

Feature-specific table implementations:

```
apps/web/src/components/[feature]/
├── [Feature].tsx                    # Main table component with data fetching
├── [feature]-columns.tsx            # Column definitions
├── [feature]-row-actions.tsx        # Row actions (optional, if complex)
└── [feature]-toolbar.tsx            # Custom toolbar (optional)
```

**Example: Organization Members**

```
apps/web/src/components/organizations/
├── OrganizationMembers.tsx                    # Main component
├── organization-members-columns.tsx           # Column definitions
└── organization-members-row-actions.tsx       # (Future: if actions grow)
```

## Component Composition Layers

### Layer 1: Main Table Component

**Responsibilities:**

- Data fetching (React Query hooks)
- Mutation handlers
- Table state management
- Rendering table structure

**Example:**

```tsx
// apps/web/src/components/organizations/OrganizationMembers.tsx
'use client';

import { useState } from 'react';
import { useReactTable, getCoreRowModel, ... } from '@tanstack/react-table';
import { useOrganizationMembers, useUpdateMemberRole, ... } from '@/hooks/queries/useOrganizationMembers';
import { Table, TableBody, TableCell, ... } from '@olympus/ui';
import { createOrganizationMembersColumns } from './organization-members-columns';

interface OrganizationMembersProps {
  organizationId: string;
}

export function OrganizationMembers({ organizationId }: OrganizationMembersProps) {
  // 1. Data fetching
  const { members, isLoading } = useOrganizationMembers(organizationId);

  // 2. Mutations
  const { removeMember } = useRemoveOrganizationMember();
  const { updateRole } = useUpdateMemberRole();

  // 3. Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // 4. Handlers
  const handleRemoveMember = async (userId: string) => {
    await removeMember({ organizationId, userId });
    toast.success('Member removed');
  };

  const handleUpdateRole = async (userId: string, role: OrganizationRole) => {
    await updateRole({ organizationId, userId, role });
    toast.success('Role updated');
  };

  // 5. Column definitions with handlers
  const columns = createOrganizationMembersColumns(handleUpdateRole, handleRemoveMember);

  // 6. Table instance
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
    state: { sorting, columnFilters, columnVisibility },
  });

  // 7. Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 8. Render table
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter by user ID..."
          value={(table.getColumn('userId')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('userId')?.setFilterValue(e.target.value)}
        />
        <Button>Add member</Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
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
  );
}
```

### Layer 2: Column Definitions

**Responsibilities:**

- Column configuration
- Cell renderers
- Helper functions for formatting/display
- Type definitions

**Pattern 1: Factory Function (Recommended for Dynamic Behavior)**

Use when columns need access to handlers or dynamic data:

```tsx
// apps/web/src/components/organizations/organization-members-columns.tsx
import { OrganizationRole } from '@/lib/api/generated';
import type { GetOrganizationMembersQuery } from '@/lib/api/hooks.generated';
import { Badge, Button, DropdownMenu, ... } from '@olympus/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { Crown, Shield, MoreHorizontal } from 'lucide-react';

// Extract type from GraphQL query result
type OrganizationMember = GetOrganizationMembersQuery['organizationMembers'][number];

// Helper functions for column rendering
export const getRoleBadge = (role: OrganizationRole) => {
  switch (role) {
    case OrganizationRole.Owner:
      return {
        label: 'Owner',
        icon: Crown,
        className: 'bg-purple-100 text-purple-700',
      };
    case OrganizationRole.Admin:
      return {
        label: 'Admin',
        icon: Shield,
        className: 'bg-blue-100 text-blue-700',
      };
    // ... other cases
  }
};

const getUserDisplayName = (member: OrganizationMember): string => {
  if (member.user?.fullName) return member.user.fullName;
  if (member.user?.email) return member.user.email.split('@')[0];
  return `User ${member.userId.substring(0, 8)}`;
};

/**
 * Create column definitions for OrganizationMembers table
 *
 * @param handleUpdateRole - Callback to update a member's role
 * @param handleRemoveMember - Callback to remove a member
 * @returns Array of column definitions for TanStack Table
 */
export function createOrganizationMembersColumns(
  handleUpdateRole: (userId: string, role: OrganizationRole) => Promise<void>,
  handleRemoveMember: (userId: string) => Promise<void>
): ColumnDef<OrganizationMember>[] {
  return [
    {
      accessorKey: 'user',
      header: 'Name',
      cell: ({ row }) => {
        const displayName = getUserDisplayName(row.original);
        return <div className="font-medium text-gray-900">{displayName}</div>;
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as OrganizationRole;
        const roleBadge = getRoleBadge(role);
        const RoleIcon = roleBadge.icon;
        return (
          <Badge className={roleBadge.className}>
            {RoleIcon && <RoleIcon className="mr-1 h-3 w-3" />}
            {roleBadge.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        return (
          <div className="text-sm text-gray-500">
            {new Date(date).toLocaleDateString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        return (
          <div className="text-sm text-gray-500">
            {row.original.user?.email}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const member = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.role !== OrganizationRole.Owner ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleUpdateRole(member.userId, OrganizationRole.Admin)}
                    disabled={member.role === OrganizationRole.Admin}
                  >
                    Make admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleUpdateRole(member.userId, OrganizationRole.Member)}
                    disabled={member.role === OrganizationRole.Member}
                  >
                    Make member
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRemoveMember(member.userId)}
                    className="text-red-600"
                  >
                    Remove member
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>Cannot modify owner</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
```

**Pattern 2: Static Export (Simple Tables)**

Use when columns are purely declarative without dynamic behavior:

```tsx
// apps/web/src/components/documents/document-list-columns.tsx
import { Badge } from '@olympus/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type { Document } from '@/lib/api/generated';

export const documentColumns: ColumnDef<Document>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return <Badge>{status}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string;
      return new Date(date).toLocaleDateString();
    },
  },
];
```

**Pattern 3: Column Helper (Type-Safe Alternative)**

Use for enhanced type safety with TanStack Table v8's column helper:

```tsx
// apps/web/src/components/documents/document-list-columns.tsx
import { createColumnHelper } from '@tanstack/react-table';
import type { Document } from '@/lib/api/generated';

const columnHelper = createColumnHelper<Document>();

export const createDocumentColumns = (
  onDelete: (id: string) => void,
  onDownload: (id: string) => void
) => [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => <div className="font-medium">{info.getValue()}</div>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'actions',
    cell: (props) => (
      <DocumentRowActions
        document={props.row.original}
        onDelete={onDelete}
        onDownload={onDownload}
      />
    ),
  }),
];
```

### Layer 3: Extracted Row Actions (Optional)

**When to extract:**

- Actions dropdown becomes >50 lines
- Actions are reused in multiple tables
- Complex conditional logic based on row state

**Example:**

```tsx
// apps/web/src/components/organizations/organization-members-row-actions.tsx
import { OrganizationRole } from '@/lib/api/generated';
import type { OrganizationMember } from './organization-members-columns';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@olympus/ui';
import { MoreHorizontal, Shield, User, Eye, Trash2 } from 'lucide-react';

interface OrganizationMemberRowActionsProps {
  member: OrganizationMember;
  onUpdateRole: (userId: string, role: OrganizationRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

export function OrganizationMemberRowActions({
  member,
  onUpdateRole,
  onRemoveMember,
}: OrganizationMemberRowActionsProps) {
  const isOwner = member.role === OrganizationRole.Owner;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {!isOwner ? (
          <>
            <DropdownMenuItem
              onClick={() =>
                onUpdateRole(member.userId, OrganizationRole.Admin)
              }
              disabled={member.role === OrganizationRole.Admin}
            >
              <Shield className="mr-2 h-4 w-4" />
              Make admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateRole(member.userId, OrganizationRole.Member)
              }
              disabled={member.role === OrganizationRole.Member}
            >
              <User className="mr-2 h-4 w-4" />
              Make member
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateRole(member.userId, OrganizationRole.Viewer)
              }
              disabled={member.role === OrganizationRole.Viewer}
            >
              <Eye className="mr-2 h-4 w-4" />
              Make viewer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRemoveMember(member.userId)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove member
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled>Cannot modify owner</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Then use in columns:

```tsx
// organization-members-columns.tsx
import { OrganizationMemberRowActions } from './organization-members-row-actions';

export function createOrganizationMembersColumns(
  handleUpdateRole: (userId: string, role: OrganizationRole) => Promise<void>,
  handleRemoveMember: (userId: string) => Promise<void>
): ColumnDef<OrganizationMember>[] {
  return [
    // ... other columns
    {
      id: 'actions',
      cell: ({ row }) => (
        <OrganizationMemberRowActions
          member={row.original}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
        />
      ),
    },
  ];
}
```

## Separation of Concerns

### ✅ SHOULD Be in Separate Files

| Concern              | File                                    | Reason                                          |
| -------------------- | --------------------------------------- | ----------------------------------------------- |
| Column definitions   | `[feature]-columns.tsx`                 | Reusable, testable, reduces main component size |
| Complex row actions  | `[feature]-row-actions.tsx`             | Reduces column file size, improves readability  |
| Toolbar with filters | `[feature]-toolbar.tsx`                 | Reusable across similar tables                  |
| Helper utilities     | `[feature]-columns.tsx` or shared utils | DRY, testable                                   |

### ❌ SHOULD Stay Together

| Concern                     | File            | Reason                                       |
| --------------------------- | --------------- | -------------------------------------------- |
| Data fetching + table logic | `[Feature].tsx` | Tightly coupled, separating adds indirection |
| Mutation handlers + table   | `[Feature].tsx` | Handlers specific to this table instance     |
| Table state + rendering     | `[Feature].tsx` | React state belongs with component           |

## When to Extract to Shared Components

### Extract to `packages/ui` when:

1. **Used in 3+ different tables** across features
2. **Zero feature-specific logic** (pure UI)
3. **Stable API** that won't change frequently

**Examples:**

- `data-table-pagination.tsx` - Standard pagination controls
- `data-table-column-header.tsx` - Sortable column headers
- `data-table-view-options.tsx` - Column visibility toggles

### Keep in feature folder when:

1. **Feature-specific logic** or data dependencies
2. **Used in only 1-2 places**
3. **Rapidly changing** during development

**Examples:**

- `organization-members-columns.tsx` - Organization-specific
- `document-list-toolbar.tsx` - Document-specific filters

## Type Definitions

### Extract types from GraphQL queries

```tsx
// organization-members-columns.tsx
import type { GetOrganizationMembersQuery } from '@/lib/api/hooks.generated';

// Extract the member type from query result
type OrganizationMember =
  GetOrganizationMembersQuery['organizationMembers'][number];

// Now use in column definitions
export function createOrganizationMembersColumns(): ColumnDef<OrganizationMember>[] {
// ...
  // ...
}
```

### Extend types for UI state (if needed)

```tsx
// types/ui/organizations.ts
import type { GetOrganizationMembersQuery } from '@/lib/api/hooks.generated';

type BaseOrganizationMember =
  GetOrganizationMembersQuery['organizationMembers'][number];

// Extend with UI-specific fields
export interface OrganizationMemberWithUI extends BaseOrganizationMember {
  isSelected: boolean;
  isExpanded: boolean;
}
```

## Testing Patterns

### Test column definitions separately

```tsx
// organization-members-columns.test.tsx
import { render, screen } from '@testing-library/react';
import { createOrganizationMembersColumns } from './organization-members-columns';

describe('OrganizationMembers columns', () => {
  it('renders role badge correctly', () => {
    const mockHandleUpdateRole = jest.fn();
    const mockHandleRemoveMember = jest.fn();

    const columns = createOrganizationMembersColumns(
      mockHandleUpdateRole,
      mockHandleRemoveMember
    );

    const roleColumn = columns.find((col) => col.accessorKey === 'role');
    // Test role column rendering
  });
});
```

### Test table component with mock data

```tsx
// OrganizationMembers.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { OrganizationMembers } from './OrganizationMembers';
import { mockOrganizationMembers } from '@/test/mocks/organizations';

jest.mock('@/hooks/queries/useOrganizationMembers');

describe('OrganizationMembers', () => {
  it('renders member list', async () => {
    render(<OrganizationMembers organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

### Memoize column definitions

If columns don't depend on dynamic handlers, memoize them:

```tsx
import { useMemo } from 'react';

export function DocumentList() {
  const columns = useMemo(() => documentColumns, []);

  const table = useReactTable({
    data,
    columns, // Stable reference
    // ...
  });
}
```

### Memoize factory-created columns

For columns with handlers, memoize to prevent re-creation:

```tsx
export function OrganizationMembers({ organizationId }: Props) {
  const handleUpdateRole = useCallback(
    async (userId: string, role: Role) => {
      // ...
    },
    [organizationId]
  );

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      // ...
    },
    [organizationId]
  );

  const columns = useMemo(
    () =>
      createOrganizationMembersColumns(handleUpdateRole, handleRemoveMember),
    [handleUpdateRole, handleRemoveMember]
  );

  // ...
}
```

## Migration Path

### Current State → Future State

**Phase 1: Current (✅ Done)**

```
apps/web/src/components/organizations/
├── OrganizationMembers.tsx
└── organization-members-columns.tsx
```

**Phase 2: Extract shared utilities**

```
packages/ui/src/components/
├── table.tsx
├── data-table.tsx                    # Generic table wrapper
└── data-table-pagination.tsx         # Shared pagination
```

**Phase 3: Extract row actions (if needed)**

```
apps/web/src/components/organizations/
├── OrganizationMembers.tsx
├── organization-members-columns.tsx
└── organization-members-row-actions.tsx
```

**Phase 4: Extract toolbar (if complex)**

```
apps/web/src/components/organizations/
├── OrganizationMembers.tsx
├── organization-members-columns.tsx
├── organization-members-row-actions.tsx
└── organization-members-toolbar.tsx
```

## Real-World Examples in Olympus

### Current Implementation: Organization Members

✅ **Follows best practices:**

- Column definitions in separate file (`organization-members-columns.tsx`)
- Factory function for dynamic columns
- Helper functions for formatting (`getRoleBadge`, `getUserDisplayName`)
- Clear JSDoc documentation
- Type-safe with GraphQL-generated types

### Future Tables

**Documents Table:**

```
apps/web/src/components/documents/
├── DocumentList.tsx
└── document-list-columns.tsx
```

**Queries Table:**

```
apps/web/src/components/queries/
├── QueryList.tsx
└── query-list-columns.tsx
```

**Spaces Table:**

```
apps/web/src/components/spaces/
├── SpaceList.tsx
└── space-list-columns.tsx
```

## Summary

### Key Principles

1. **Hybrid naming**: PascalCase for components, kebab-case for configs
2. **Separation of concerns**: Column definitions in separate files
3. **Factory pattern**: Use factory functions for dynamic columns
4. **Type safety**: Extract types from GraphQL queries
5. **Progressive extraction**: Start simple, extract when complexity grows
6. **Reusability**: Share utilities in `@olympus/ui`, keep feature logic in feature folders

### Quick Decision Tree

**Should I create a new file?**

```
Is it a column definition?
├─ Yes → [feature]-columns.tsx
└─ No
   └─ Is it a complex row action component (>50 lines)?
      ├─ Yes → [feature]-row-actions.tsx
      └─ No
         └─ Is it a toolbar with filters?
            ├─ Yes → [feature]-toolbar.tsx
            └─ No → Keep in main component
```

**Should I extract to @olympus/ui?**

```
Is it used in 3+ features?
├─ Yes
│  └─ Does it have zero feature-specific logic?
│     ├─ Yes → Extract to packages/ui
│     └─ No → Keep in feature folder, create shared types if needed
└─ No → Keep in feature folder
```

### Your Current Setup: Already Excellent ✅

Your `organization-members-columns.tsx` structure is already following industry best practices:

- ✅ kebab-case naming (shadcn/ui standard)
- ✅ Factory function pattern for dynamic behavior
- ✅ Helper functions colocated
- ✅ Type-safe with GraphQL types
- ✅ Clear JSDoc documentation
- ✅ Separated from main component

No immediate changes needed - you're on the right track!
