'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteMember, useCurrentOrganization, useOrganizationRole } from '@/hooks/use-organization';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { XIcon, UserPlusIcon, MailIcon, LoaderIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const inviteFormSchema = z.object({
  emails: z.string().min(1, 'At least one email is required'),
  role: z.enum(['member', 'admin', 'owner']),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface PendingInvitation {
  id: string;
  email: string;
  role: 'member' | 'admin' | 'owner';
  invitedAt: Date;
  status: 'pending' | 'expired';
}

interface OrganizationInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationInviteDialog({ open, onOpenChange }: OrganizationInviteDialogProps) {
  const { organization } = useCurrentOrganization();
  const { isAdmin } = useOrganizationRole();
  const inviteMember = useInviteMember();
  const queryClient = useQueryClient();
  const [emailTags, setEmailTags] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      emails: '',
      role: 'member',
    },
  });

  const { data: pendingInvitations, isLoading: loadingInvitations } = useQuery({
    queryKey: ['organization-invitations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      try {
        const response = await fetch(`/api/organizations/${organization.id}/invitations`);
        if (!response.ok) throw new Error('Failed to fetch invitations');
        const invitations = await response.json();
        return invitations as PendingInvitation[];
      } catch (error) {
        console.error('Failed to fetch invitations:', error);
        return [];
      }
    },
    enabled: Boolean(organization?.id) && open,
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!organization?.id) throw new Error('No organization selected');

      const response = await fetch(`/api/organizations/${organization.id}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel invitation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organization?.id] });
      toast.success('Invitation canceled');
    },
    onError: (error) => {
      console.error('Failed to cancel invitation:', error);
      toast.error('Failed to cancel invitation');
    },
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmailTag();
    }
  };

  const addEmailTag = () => {
    const trimmedEmail = emailInput.trim().replace(/,$/g, '');

    if (trimmedEmail && validateEmail(trimmedEmail)) {
      if (!emailTags.includes(trimmedEmail)) {
        setEmailTags([...emailTags, trimmedEmail]);
        form.setValue('emails', [...emailTags, trimmedEmail].join(','));
      }
      setEmailInput('');
    } else if (trimmedEmail) {
      toast.error('Invalid email address');
    }
  };

  const removeEmailTag = (emailToRemove: string) => {
    const updatedEmails = emailTags.filter((email) => email !== emailToRemove);
    setEmailTags(updatedEmails);
    form.setValue('emails', updatedEmails.join(','));
  };

  const onSubmit = async (values: InviteFormValues) => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return;
    }

    const emails =
      emailTags.length > 0
        ? emailTags
        : values.emails
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e);

    if (emails.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    const invalidEmails = emails.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    try {
      const invitePromises = emails.map((email) =>
        inviteMember.mutateAsync({
          organizationId: organization.id,
          email,
          role: values.role,
        }),
      );

      await Promise.all(invitePromises);

      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organization.id] });

      form.reset();
      setEmailTags([]);
      setEmailInput('');

      if (emails.length === 1) {
        toast.success(`Invitation sent to ${emails[0]}`);
      } else {
        toast.success(`${emails.length} invitations sent successfully`);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send invitations:', error);
      toast.error('Failed to send some invitations');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>Invite new members to join {organization?.name || 'your organization'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Addresses</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md">
                        {emailTags.map((email) => (
                          <Badge key={email} variant="secondary" className="flex items-center gap-1">
                            <MailIcon className="w-3 h-3" />
                            {email}
                            <button
                              type="button"
                              onClick={() => removeEmailTag(email)}
                              className="ml-1 hover:text-destructive"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        <Input
                          {...field}
                          type="email"
                          placeholder={emailTags.length === 0 ? 'Enter email addresses...' : 'Add more...'}
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={handleEmailInputKeyDown}
                          onBlur={addEmailTag}
                          className="flex-1 min-w-[200px] border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>Enter email addresses separated by commas, spaces, or press Enter</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Choose the role for invited members</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {pendingInvitations && pendingInvitations.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-2">Pending Invitations</h3>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {loadingInvitations ? (
                        <div className="flex items-center justify-center py-4">
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        pendingInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <MailIcon className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{invitation.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Role: {invitation.role} • Invited{' '}
                                  {new Date(invitation.invitedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation.mutate(invitation.id)}
                              disabled={cancelInvitation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || inviteMember.isPending}>
                {form.formState.isSubmitting || inviteMember.isPending ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Send Invitations
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
