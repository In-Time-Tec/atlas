import { auth } from '@/lib/auth';
import { config } from 'dotenv';
import { headers } from 'next/headers';
import { User, Organization, OrganizationMember } from './db/schema';
import { sessionCache, extractSessionToken, createSessionKey } from './performance-cache';
import { db } from './db';
import { organization, organizationMember, userOrganizationSession } from './db/schema';
import { eq, and } from 'drizzle-orm';

config({
  path: '.env.local',
});

export const getSession = async () => {
  const requestHeaders = await headers();
  const sessionToken = extractSessionToken(requestHeaders);

  if (sessionToken) {
    const cacheKey = createSessionKey(sessionToken);
    const cached = sessionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (sessionToken && session?.user) {
    const cacheKey = createSessionKey(sessionToken);
    sessionCache.set(cacheKey, session);
  }

  return session;
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user as User | null;
};

export const getUserWithOrganization = async (): Promise<{
  user: User | null;
  activeOrganization: Organization | null;
  membership: OrganizationMember | null;
}> => {
  const user = await getUser();

  if (!user) {
    return { user: null, activeOrganization: null, membership: null };
  }

  const orgSession = await db.query.userOrganizationSession.findFirst({
    where: eq(userOrganizationSession.userId, user.id),
  });

  if (!orgSession?.activeOrganizationId) {
    return { user, activeOrganization: null, membership: null };
  }

  const [activeOrganization, membership] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, orgSession.activeOrganizationId),
    }),
    db.query.organizationMember.findFirst({
      where: and(
        eq(organizationMember.organizationId, orgSession.activeOrganizationId),
        eq(organizationMember.userId, user.id),
      ),
    }),
  ]);

  // If user is not a member anymore, treat as personal context
  if (!activeOrganization || !membership) {
    return { user, activeOrganization: null, membership: null };
  }

  return { user, activeOrganization, membership };
};

export const getActiveOrganization = async (): Promise<Organization | null> => {
  const { activeOrganization } = await getUserWithOrganization();
  return activeOrganization;
};

export const requireOrganizationAccess = async (
  requiredRole?: 'owner' | 'admin' | 'member' | 'viewer',
): Promise<{
  user: User;
  organization: Organization;
  membership: OrganizationMember;
}> => {
  const { user, activeOrganization, membership } = await getUserWithOrganization();

  if (!user) {
    throw new Error('Authentication required');
  }

  if (!activeOrganization || !membership) {
    throw new Error('Organization access required');
  }

  if (requiredRole) {
    const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
    }
  }

  return { user, organization: activeOrganization, membership };
};
