import { OrganizationRole } from '@/lib/api/generated';
import type { GetOrganizationMembersQuery } from '@/lib/api/hooks.generated';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@olympus/ui';
import { MoreHorizontal, Shield, User, Eye, Trash2 } from 'lucide-react';

type OrganizationMember =
  GetOrganizationMembersQuery['organizationMembers'][number];

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
