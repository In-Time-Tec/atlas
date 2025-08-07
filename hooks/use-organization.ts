import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organization, useListOrganizations as useListOrgBase, useSession } from '@/lib/auth-client';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface OrganizationMember {
  id: string;
  email: string;
  name?: string;
  role: 'member' | 'admin' | 'owner';
  joinedAt: Date;
}

const FIVE_MINUTES_IN_MS = 1000 * 60 * 5;
const TEN_MINUTES_IN_MS = 1000 * 60 * 10;

const organizationKeys = {
  all: ['organization'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (filters?: any) => [...organizationKeys.lists(), filters] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
  active: () => [...organizationKeys.all, 'active'] as const,
  members: (id: string) => [...organizationKeys.all, 'members', id] as const,
};

export function useCurrentOrganization() {
  const {
    data: orgContext,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['active-organization'],
    queryFn: async () => {
      const response = await fetch('/api/organizations/set-active', { method: 'GET' });
      if (!response.ok) return { activeOrganization: null } as any;
      return response.json();
    },
    staleTime: FIVE_MINUTES_IN_MS,
  });

  return {
    organization: (orgContext?.activeOrganization || null) as Organization | null,
    isLoading: isPending,
    error,
    refetch,
  };
}

export function useOrganizations() {
  const { data: organizations, error, isPending, refetch } = useListOrgBase();

  return {
    organizations: (organizations || []) as Organization[],
    isLoading: isPending,
    error,
    refetch,
  };
}

export function useOrganizationMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.members(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const response = await fetch(`/api/organizations/${organizationId}/members`);
        if (!response.ok) throw new Error('Failed to fetch members');
        const members = await response.json();
        return members as OrganizationMember[];
      } catch (error) {
        console.error('Failed to fetch organization members:', error);
        return [];
      }
    },
    enabled: Boolean(organizationId),
    staleTime: FIVE_MINUTES_IN_MS,
    gcTime: TEN_MINUTES_IN_MS,
  });
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (organizationId: string | null) => {
      const response = await fetch('/api/organizations/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set active organization');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['active-organization'] });
      queryClient.invalidateQueries({ queryKey: ['organization-context'] });
      queryClient.invalidateQueries({ queryKey: ['comprehensive-user-data'] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['custom-instructions'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });

      toast.success('Switched organization successfully');
    },
    onError: (error) => {
      console.error('Failed to switch organization:', error);
      toast.error('Failed to switch organization');
    },
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; slug: string; logo?: string; metadata?: Record<string, any> }) => {
      const response = await organization.create(data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.active() });
      if (data && 'name' in data) {
        toast.success(`Organization "${data.name}" created successfully`);
      } else {
        toast.success('Organization created successfully');
      }
    },
    onError: (error) => {
      console.error('Failed to create organization:', error);
      toast.error('Failed to create organization');
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: { name?: string; slug?: string; logo?: string; metadata?: Record<string, any> };
    }) => {
      await organization.update({ organizationId, data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.active() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.organizationId) });
      toast.success('Organization updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update organization:', error);
      toast.error('Failed to update organization');
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await organization.delete({ organizationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.active() });
      toast.success('Organization deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete organization:', error);
      toast.error('Failed to delete organization');
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      email,
      role = 'member',
    }: {
      organizationId: string;
      email: string;
      role?: 'member' | 'admin' | 'owner';
    }) => {
      await organization.inviteMember({ organizationId, email, role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(variables.organizationId) });
      toast.success(`Invitation sent to ${variables.email}`);
    },
    onError: (error) => {
      console.error('Failed to invite member:', error);
      toast.error('Failed to send invitation');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, memberId }: { organizationId: string; memberId: string }) => {
      await organization.removeMember({ organizationId, memberIdOrEmail: memberId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(variables.organizationId) });
      toast.success('Member removed successfully');
    },
    onError: (error) => {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      memberId,
      role,
    }: {
      organizationId: string;
      memberId: string;
      role: 'member' | 'admin' | 'owner';
    }) => {
      await organization.updateMemberRole({ organizationId, memberId, role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(variables.organizationId) });
      toast.success('Member role updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update member role:', error);
      toast.error('Failed to update member role');
    },
  });
}

export function useRefreshOrganizations() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
  };
}

export function useClearOrganizationCaches() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return () => {
    queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    queryClient.invalidateQueries({ queryKey: ['comprehensive-user-data'] });
    queryClient.invalidateQueries({ queryKey: ['chat'] });
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['custom-instructions'] });
    queryClient.invalidateQueries({ queryKey: ['usage'] });
  };
}

// Removed deprecated organizationOptions helper that referenced a non-existent /api/organizations route

export function useIsInOrganization() {
  const { organization } = useCurrentOrganization();
  return Boolean(organization);
}

export function useOrganizationRole(organizationId?: string) {
  const { organization: currentOrg } = useCurrentOrganization();
  const { data: session } = useSession();
  const orgId = organizationId || currentOrg?.id;

  const { data: members } = useOrganizationMembers(orgId);

  const currentUserRole = members?.find((member) => member.email === session?.user?.email)?.role;

  return {
    role: currentUserRole,
    isOwner: currentUserRole === 'owner',
    isAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    isMember: Boolean(currentUserRole),
  };
}
