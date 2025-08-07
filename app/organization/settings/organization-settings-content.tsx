'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, UserAdd01Icon, UserIcon, CrownIcon, ShieldIcon } from '@hugeicons/core-free-icons';
//
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useUpdateOrganization,
  useDeleteOrganization,
  useOrganizationMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useSwitchOrganization,
} from '@/hooks/use-organization';
import { MembersTable } from './members-table';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface OrganizationSettingsContentProps {
  organization: Organization;
  isOwner: boolean;
  isAdmin: boolean;
}

export function OrganizationSettingsContent({ organization, isOwner, isAdmin }: OrganizationSettingsContentProps) {
  const router = useRouter();
  const [orgName, setOrgName] = React.useState(organization.name);
  const [orgSlug, setOrgSlug] = React.useState(organization.slug);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'member' | 'admin' | 'owner'>('member');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);

  const generateSlug = React.useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  }, []);

  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();
  const switchOrganization = useSwitchOrganization();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const updateMemberRole = useUpdateMemberRole();

  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(organization.id);
  const ownersCount = React.useMemo(() => members.filter((m) => m.role === 'owner').length, [members]);

  // Sync local state when the active organization changes
  React.useEffect(() => {
    setOrgName(organization.name);
    setOrgSlug(organization.slug);
    setInviteEmail('');
    setInviteRole('member');
    setIsInviteDialogOpen(false);
  }, [organization.id, organization.name, organization.slug]);

  const handleUpdateOrganization = React.useCallback(() => {
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    if (!orgSlug.trim()) {
      toast.error('Organization slug is required');
      return;
    }

    updateOrganization.mutate({
      organizationId: organization.id,
      data: {
        name: orgName,
        slug: orgSlug,
      },
    });
  }, [orgName, orgSlug, organization.id, updateOrganization]);

  const handleDeleteOrganization = React.useCallback(() => {
    deleteOrganization.mutate(organization.id, {
      onSuccess: async () => {
        try {
          await switchOrganization.mutateAsync(null);
        } finally {
          router.replace('/settings');
        }
      },
    });
  }, [organization.id, deleteOrganization, switchOrganization, router]);

  const handleInviteMember = React.useCallback(() => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    inviteMember.mutate(
      {
        organizationId: organization.id,
        email: inviteEmail,
        role: inviteRole,
      },
      {
        onSuccess: () => {
          setInviteEmail('');
          setInviteRole('member');
          setIsInviteDialogOpen(false);
        },
      },
    );
  }, [inviteEmail, inviteRole, organization.id, inviteMember]);

  const hasUnsavedChanges = orgName !== organization.name || orgSlug !== organization.slug;

  const handleSafeRemoveMember = React.useCallback(
    (memberId: string) => {
      const target = members.find((m) => m.id === memberId);
      if (!target) return;
      if (members.length <= 1) {
        toast.error('Cannot remove the last remaining member');
        return;
      }
      if (target.role === 'owner' && ownersCount === 1) {
        toast.error('Cannot remove the only owner');
        return;
      }
      removeMember.mutate({ organizationId: organization.id, memberId });
    },
    [members, ownersCount, organization.id, removeMember],
  );

  const handleSafeUpdateRole = React.useCallback(
    (memberId: string, role: 'member' | 'admin' | 'owner') => {
      const target = members.find((m) => m.id === memberId);
      if (!target) return;
      if (target.role === 'owner' && role !== 'owner' && ownersCount === 1) {
        toast.error('Cannot demote the only owner');
        return;
      }
      updateMemberRole.mutate({ organizationId: organization.id, memberId, role });
    },
    [members, ownersCount, organization.id, updateMemberRole],
  );

  return (
    <div className="space-y-8">
      {/* Organization Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-semibold">Organization Details</span>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => {
                const next = e.target.value;
                setOrgName(next);
                const currentGenerated = generateSlug(organization.name);
                if (orgSlug === currentGenerated) {
                  setOrgSlug(generateSlug(next));
                }
              }}
              placeholder="Acme Inc."
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Organization Slug</Label>
            <Input
              id="org-slug"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="acme-inc"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">Used in URLs. Lowercase letters, numbers, and hyphens only.</p>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={handleUpdateOrganization} disabled={!hasUnsavedChanges || updateOrganization.isPending}>
                {updateOrganization.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm font-semibold">Organization Members</span>
          </div>
          {isAdmin && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <HugeiconsIcon icon={UserAdd01Icon} size={16} className="mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] p-4 sm:p-5 rounded-md">
                <DialogHeader>
                  <DialogTitle>Invite a New Member</DialogTitle>
                  <DialogDescription>Send an invitation to join your organization.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={UserIcon} size={16} />
                            Member
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={ShieldIcon} size={16} />
                            Admin
                          </div>
                        </SelectItem>
                        {isOwner && (
                          <SelectItem value="owner">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon icon={CrownIcon} size={16} />
                              Owner
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember} disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'Sending…' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="rounded-lg border bg-card/50 p-3">
          <MembersTable
            members={members}
            isLoading={membersLoading}
            isOwner={isOwner}
            isAdmin={isAdmin}
            organizationId={organization.id}
            onRemoveMember={handleSafeRemoveMember}
            onUpdateRole={handleSafeUpdateRole}
          />
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <span className="text-sm font-semibold">Danger Zone</span>
          </div>
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                    Delete Organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[420px]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the organization{' '}
                      <strong>{organization.name}</strong> and remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrganization}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteOrganization.isPending}
                    >
                      {deleteOrganization.isPending ? 'Deleting…' : 'Delete Organization'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
