'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Settings02Icon,
  UserMultiple02Icon,
  Delete02Icon,
  UserAdd01Icon,
  Mail01Icon,
  UserIcon,
  CrownIcon,
  ShieldIcon,
  MoreVerticalIcon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useUpdateOrganization,
  useDeleteOrganization,
  useOrganizationMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
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

  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const updateMemberRole = useUpdateMemberRole();

  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(organization.id);

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
      onSuccess: () => {
        router.push('/');
      },
    });
  }, [organization.id, deleteOrganization, router]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
        <p className="text-muted-foreground">Manage your organization details, members, and permissions.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={16} />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <HugeiconsIcon icon={UserMultiple02Icon} size={16} />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Update your organization&apos;s basic information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-slug">Organization Slug</Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="Enter organization slug"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">This is used in URLs and must be unique.</p>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleUpdateOrganization}
                    disabled={!hasUnsavedChanges || updateOrganization.isPending}
                  >
                    {updateOrganization.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible and destructive actions.</CardDescription>
              </CardHeader>
              <CardContent>
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
                    <AlertDialogContent>
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
                          {deleteOrganization.isPending ? 'Deleting...' : 'Delete Organization'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Members</CardTitle>
                  <CardDescription>Manage members and their roles within your organization.</CardDescription>
                </div>
                {isAdmin && (
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <HugeiconsIcon icon={UserAdd01Icon} size={16} className="mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite a New Member</DialogTitle>
                        <DialogDescription>Send an invitation to join your organization.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
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
                          {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <MembersTable
                members={members}
                isLoading={membersLoading}
                isOwner={isOwner}
                isAdmin={isAdmin}
                organizationId={organization.id}
                onRemoveMember={(memberId) => removeMember.mutate({ organizationId: organization.id, memberId })}
                onUpdateRole={(memberId, role) =>
                  updateMemberRole.mutate({ organizationId: organization.id, memberId, role })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
