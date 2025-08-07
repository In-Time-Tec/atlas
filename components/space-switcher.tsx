'use client';

import * as React from 'react';
import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCurrentOrganization,
  useOrganizations,
  useSwitchOrganization,
  useCreateOrganization,
} from '@/hooks/use-organization';
import { useUserData } from '@/hooks/use-user-data';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function SpaceSwitcher({ className }: { className?: string }) {
  const { user } = useUserData();
  const { organization: currentOrg, isLoading: isLoadingCurrent } = useCurrentOrganization();
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();
  const switchOrganization = useSwitchOrganization();
  const createOrganization = useCreateOrganization();
  const pathname = usePathname();
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isLoading = isLoadingCurrent || isLoadingOrgs;
  const displayName = currentOrg?.name || 'Personal';
  const displaySlug = currentOrg?.slug || user?.email?.split('@')[0] || 'personal';

  const handleSwitchOrganization = async (orgId: string | null) => {
    await switchOrganization.mutateAsync(orgId);
    // Stay on the same route; unified /settings handles both contexts.
    // If user is on a route that no longer exists (legacy org settings), normalize to /settings.
    if (pathname?.startsWith('/organization/settings')) {
      router.replace('/settings');
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName || !newOrgSlug) return;

    setIsCreating(true);
    try {
      const created = await createOrganization.mutateAsync({
        name: newOrgName,
        slug: newOrgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });
      // Auto-switch context to the newly created org when available
      if (created && (created as any).id) {
        await switchOrganization.mutateAsync((created as any).id as string);
      }
      setCreateDialogOpen(false);
      setNewOrgName('');
      setNewOrgSlug('');
    } finally {
      setIsCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            role="combobox"
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-none ring-ring transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'focus-visible:ring-2',
              'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
              className,
            )}
            disabled={isLoading}
          >
            <Avatar className="h-4 w-4">
              {currentOrg ? (
                currentOrg.logo ? (
                  <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
                ) : (
                  <></>
                )
              ) : user?.image ? (
                <AvatarImage src={user.image} alt={user?.name || 'Personal'} />
              ) : (
                <></>
              )}
              <AvatarFallback className="text-[10px]">
                {currentOrg ? <Building2 className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left">{displayName}</span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[90vw] sm:w-[16em] max-w-[16em] p-0 font-sans rounded-lg bg-popover z-40 border !shadow-none"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuItem
            onClick={() => handleSwitchOrganization(null)}
            className="flex items-center justify-between px-2 m-1 text-xs transition-all duration-200 hover:bg-accent data-[selected=true]:bg-accent cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-4 w-4">
                {user?.image && <AvatarImage src={user.image} alt={user?.name || 'Personal'} />}
                <AvatarFallback className="text-[10px]">
                  <User className="h-2.5 w-2.5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium">Personal</span>
                <span className="text-xs text-muted-foreground">{user?.email?.split('@')[0] || 'personal'}</span>
              </div>
            </div>
            {!currentOrg && <Check className="h-3 w-3" />}
          </DropdownMenuItem>
          {organizations.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id)}
                  className="flex items-center justify-between px-2 m-1 text-xs transition-all duration-200 hover:bg-accent data-[selected=true]:bg-accent cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4 w-4">
                      {org.logo && <AvatarImage src={org.logo} alt={org.name} />}
                      <AvatarFallback className="text-[10px]">
                        <Building2 className="h-2.5 w-2.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{org.name}</span>
                      <span className="text-xs text-muted-foreground">{org.slug}</span>
                    </div>
                  </div>
                  {currentOrg?.id === org.id && <Check className="h-3 w-3" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 py-3 m-1 text-xs transition-all duration-200 hover:bg-accent cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span className="text-xs font-medium">Create Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[360px] p-4 sm:p-5 rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              New Organization
            </DialogTitle>
            <DialogDescription className="text-xs">Create a team space for your organization.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="Acme Inc."
                value={newOrgName}
                onChange={(e) => {
                  setNewOrgName(e.target.value);
                  if (!newOrgSlug || newOrgSlug === generateSlug(newOrgName)) {
                    setNewOrgSlug(generateSlug(e.target.value));
                  }
                }}
                disabled={isCreating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-slug">Organization Slug</Label>
              <Input
                id="org-slug"
                placeholder="acme-inc"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">Used in URLs. Must be unique.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewOrgName('');
                setNewOrgSlug('');
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization} disabled={!newOrgName || !newOrgSlug || isCreating}>
              {isCreating ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SpaceSwitcher;


