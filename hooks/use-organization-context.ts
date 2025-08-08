import { useQuery } from '@tanstack/react-query';
import { getOrganizationContext } from '@/lib/actions/org';

export function useOrganizationContext() {
  const {
    data: organizationContext,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['organization-context'],
    queryFn: getOrganizationContext,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    organizationContext,
    isLoading,
    error,
    refetch,

    organizationName: organizationContext?.activeOrganization?.name,
    organizationId: organizationContext?.activeOrganization?.id,
    organizationSlug: organizationContext?.activeOrganization?.slug,
    userRole: organizationContext?.membership?.role,

    isPersonalContext: !organizationContext?.activeOrganization,
    hasOrganizationAccess: Boolean(organizationContext?.membership),
    isOwner: organizationContext?.membership?.role === 'owner',
    isAdmin: organizationContext?.membership?.role === 'admin',
    canManageOrganization: ['owner', 'admin'].includes(organizationContext?.membership?.role || ''),
  };
}
