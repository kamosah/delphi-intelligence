import { OrganizationRole } from '@/lib/api/generated';
import type { GetOrganizationMembersQuery } from '@/lib/api/hooks.generated';
import { Badge, Button } from '@olympus/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Crown, Eye, Shield } from 'lucide-react';
import { OrganizationMemberRowActions } from './organization-members-row-actions';

// Extract the OrganizationMember type from the query result
type OrganizationMember =
  GetOrganizationMembersQuery['organizationMembers'][number];

// Role badge styling helper
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
    case OrganizationRole.Member:
      return {
        label: 'Member',
        icon: null,
        className: 'bg-gray-100 text-gray-700',
      };
    case OrganizationRole.Viewer:
      return {
        label: 'Viewer',
        icon: Eye,
        className: 'bg-gray-100 text-gray-600',
      };
    default:
      return {
        label: String(role),
        icon: null,
        className: 'bg-gray-100 text-gray-700',
      };
  }
};

// Helper to get user display name
const getUserDisplayName = (member: OrganizationMember): string => {
  if (member.user?.fullName) {
    return member.user.fullName;
  }
  if (member.user?.email) {
    return member.user.email.split('@')[0];
  }
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
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const member = row.original;
        const displayName = getUserDisplayName(member);

        return <div className="font-medium text-gray-900">{displayName}</div>;
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Role
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
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
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Joined
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
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
      accessorKey: 'user.email',
      header: 'Email',
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="text-sm text-gray-500">{member?.user?.email}</div>
        );
      },
    },
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
