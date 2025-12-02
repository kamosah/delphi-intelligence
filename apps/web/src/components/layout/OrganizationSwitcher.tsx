'use client';

import { useState } from 'react';
import { Check, ChevronDown, Building2, Plus } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from '@olympus/ui';
import { CreateOrganizationDialog } from '@/components/organizations/CreateOrganizationDialog';
import { useIsOrgSwitching } from '@/hooks/useIsOrgSwitching';
import {
  useOrganizations,
  useSwitchOrganization,
  type Organization,
} from '@/hooks/useOrganizations';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

interface OrganizationSwitcherProps {
  className?: string;
}

/**
 * OrganizationSwitcher - Hex-style dropdown for switching between organizations
 *
 * Design: Follows Hex workspace switcher pattern with clean dropdown,
 * current organization indicator, and seamless switching UX.
 */
export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const { currentOrganization } = useAuthStore();
  const { organizations = [], isLoading } = useOrganizations();
  const { switchOrganization } = useSwitchOrganization();
  const isSwitching = useIsOrgSwitching();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleSelectOrganization = async (orgId: string) => {
    try {
      await switchOrganization({ input: { organizationId: orgId } });
    } catch (error) {
      console.error(
        '[OrganizationSwitcher] Failed to switch organization:',
        error
      );
      // Error already shown via toast in useSwitchOrganization
    }
  };

  const handleOrganizationCreated = async (organization: Organization) => {
    // Auto-select the newly created organization
    try {
      await switchOrganization({ input: { organizationId: organization.id } });
    } catch (error) {
      console.error('Failed to set new organization as current:', error);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2',
          className
        )}
      >
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 flex-1" />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={isSwitching}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-lg border-gray-200 bg-white px-3 py-2 text-left font-normal hover:bg-gray-50',
              isSwitching && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {isSwitching ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              ) : (
                <Building2 className="h-4 w-4 shrink-0 text-gray-600" />
              )}
              <span className="truncate text-sm font-medium text-gray-900">
                {currentOrganization?.name || 'Select organization'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-gray-500">
            Your Organizations
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 bg-gray-100" />

          {organizations.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <Building2 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No organizations yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Create one to get started
              </p>
            </div>
          ) : (
            organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                disabled={isSwitching}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-sm',
                  'hover:bg-gray-50 focus:bg-gray-50',
                  currentOrganization?.id === org.id && 'bg-blue-50'
                )}
                onSelect={() => handleSelectOrganization(org.id)}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'truncate font-medium',
                      currentOrganization?.id === org.id
                        ? 'text-blue-700'
                        : 'text-gray-900'
                    )}
                  >
                    {org.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {org.memberCount} member{org.memberCount !== 1 ? 's' : ''} ·{' '}
                    {org.spaceCount} space{org.spaceCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {currentOrganization?.id === org.id && (
                  <Check className="h-4 w-4 shrink-0 text-blue-600" />
                )}
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator className="my-1 bg-gray-100" />

          <DropdownMenuItem
            disabled={isSwitching}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:bg-blue-50"
            onSelect={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleOrganizationCreated}
      />
    </>
  );
}
