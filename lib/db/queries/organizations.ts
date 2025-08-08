import 'server-only';
import { and, eq, inArray, gte, asc } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { organization, organizationMember, messageUsage, extremeSearchUsage } from '@/lib/db/schema';
import { getOrganizationUsageStatsRaw } from './usage';

export async function getOrganizationById(id: string) {
  try {
    const [org] = await db.select().from(organization).where(eq(organization.id, id));
    return org || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get organization by id');
  }
}

export async function getOrganizationMembers(organizationId: string) {
  try {
    return await db.select().from(organizationMember).where(eq(organizationMember.organizationId, organizationId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get organization members');
  }
}

export async function getUserOrganizations(userId: string) {
  try {
    const memberships = await db.select().from(organizationMember).where(eq(organizationMember.userId, userId));
    if (memberships.length === 0) return [];
    const orgIds = memberships.map((m) => m.organizationId);
    return await db.select().from(organization).where(inArray(organization.id, orgIds));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user organizations');
  }
}

export async function getOrganizationUsageStats(organizationId: string) {
  try {
    const members = await getOrganizationMembers(organizationId);
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) {
      return { totalMessages: 0, totalExtremeSearches: 0, memberCount: 0, dailyMessages: [] };
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { messageStats, extremeSearchStats, dailyMessages } = await getOrganizationUsageStatsRaw(memberIds, thirtyDaysAgo);
    return {
      totalMessages: messageStats[0]?.messageCount || 0,
      totalExtremeSearches: extremeSearchStats[0]?.searchCount || 0,
      memberCount: members.length,
      dailyMessages,
    };
  } catch (error) {
    console.error('Error getting organization usage stats:', error);
    return { totalMessages: 0, totalExtremeSearches: 0, memberCount: 0, dailyMessages: [] };
  }
}


