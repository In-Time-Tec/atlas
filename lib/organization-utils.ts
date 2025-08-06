import { db } from '@/lib/db';
import { organizationMember } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function isUserInOrganization(userId: string, organizationId: string): Promise<boolean> {
  try {
    const member = await db
      .select()
      .from(organizationMember)
      .where(and(eq(organizationMember.userId, userId), eq(organizationMember.organizationId, organizationId)))
      .limit(1);

    return member.length > 0;
  } catch (error) {
    console.error('Error checking organization membership:', error);
    return false;
  }
}

export async function getUserOrganizationRole(
  userId: string,
  organizationId: string,
): Promise<'owner' | 'admin' | 'member' | null> {
  try {
    const member = await db
      .select({ role: organizationMember.role })
      .from(organizationMember)
      .where(and(eq(organizationMember.userId, userId), eq(organizationMember.organizationId, organizationId)))
      .limit(1);

    if (member.length === 0) {
      return null;
    }

    return member[0].role as 'owner' | 'admin' | 'member';
  } catch (error) {
    console.error('Error getting organization role:', error);
    return null;
  }
}

export async function canUserAccessOrganizationFiles(userId: string, organizationId: string): Promise<boolean> {
  return await isUserInOrganization(userId, organizationId);
}

export async function canUserModifyOrganizationFiles(userId: string, organizationId: string): Promise<boolean> {
  const role = await getUserOrganizationRole(userId, organizationId);
  return role === 'owner' || role === 'admin' || role === 'member';
}
