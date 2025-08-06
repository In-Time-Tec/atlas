'use client';

import * as React from 'react';
import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, User } from 'lucide-react';
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

export function OrganizationSwitcher({ className }: { className?: string }) {
  const { user } = useUserData();
  const { organization: currentOrg, isLoading: isLoadingCurrent } = useCurrentOrganization();
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();
  const switchOrganization = useSwitchOrganization();
  const createOrganization = useCreateOrganization();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isLoading = isLoadingCurrent || isLoadingOrgs;
  const displayName = currentOrg?.name || 'Personal';
  const displaySlug = currentOrg?.slug || user?.email?.split('@')[0] || 'personal';

  const handleSwitchOrganization = async (orgId: string | null) => {
    await switchOrganization.mutateAsync(orgId);
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName || !newOrgSlug) return;

    setIsCreating(true);
    try {
      await createOrganization.mutateAsync({
        name: newOrgName,
        slug: newOrgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <DropdownMenu >
        <DropdownMenuTrigger asChild>
          <button
            role="combobox"
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-none ring-ring transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'focus-visible:ring-2',
              'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
              className
            )}
            disabled={isLoading}
          >
            {currentOrg ? <Building2 size={18} strokeWidth={1.5} className="shrink-0" /> : <User size={18} strokeWidth={1.5} className="shrink-0" />}
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
                <AvatarFallback className="text-xs">
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
                      <AvatarFallback className="text-xs">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Create a new organization to collaborate with your team.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <p className="text-xs text-muted-foreground">This will be used in URLs and must be unique.</p>
            </div>
          </div>
          <DialogFooter>
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
