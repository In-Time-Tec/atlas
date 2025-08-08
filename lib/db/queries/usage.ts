import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { extremeSearchUsage, messageUsage, message, chat } from '@/lib/db/schema';

export async function getExtremeSearchUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    startOfNextMonth.setHours(0, 0, 0, 0);
    const [usage] = await db
      .select()
      .from(extremeSearchUsage)
      .where(and(eq(extremeSearchUsage.userId, userId), gte(extremeSearchUsage.date, startOfMonth), lt(extremeSearchUsage.date, startOfNextMonth)))
      .limit(1);
    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get extreme search usage');
  }
}

export async function incrementExtremeSearchUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);
    const existingUsage = await getExtremeSearchUsageByUserId({ userId });
    if (existingUsage) {
      const [updatedUsage] = await db.update(extremeSearchUsage).set({ searchCount: existingUsage.searchCount + 1, updatedAt: new Date() }).where(eq(extremeSearchUsage.id, existingUsage.id)).returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db.insert(extremeSearchUsage).values({ userId, searchCount: 1, date: today, resetAt: endOfMonth }).returning();
      return newUsage;
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to increment extreme search usage');
  }
}

export async function getExtremeSearchCount({ userId }: { userId: string }): Promise<number> {
  try {
    const usage = await getExtremeSearchUsageByUserId({ userId });
    return usage?.searchCount || 0;
  } catch (error) {
    console.error('Error getting extreme search count:', error);
    return 0;
  }
}

export async function getMessageUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    startOfNextDay.setHours(0, 0, 0, 0);
    const [usage] = await db
      .select()
      .from(messageUsage)
      .where(and(eq(messageUsage.userId, userId), gte(messageUsage.date, startOfDay), lt(messageUsage.date, startOfNextDay)))
      .limit(1);
    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message usage');
  }
}

export async function incrementMessageUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);
    await db.delete(messageUsage).where(and(eq(messageUsage.userId, userId), lt(messageUsage.date, today)));
    const existingUsage = await getMessageUsageByUserId({ userId });
    if (existingUsage) {
      const [updatedUsage] = await db.update(messageUsage).set({ messageCount: existingUsage.messageCount + 1, updatedAt: new Date() }).where(eq(messageUsage.id, existingUsage.id)).returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db.insert(messageUsage).values({ userId, messageCount: 1, date: today, resetAt: endOfDay }).returning();
      return newUsage;
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to increment message usage');
  }
}

export async function getMessageCount({ userId }: { userId: string }): Promise<number> {
  try {
    const usage = await getMessageUsageByUserId({ userId });
    return usage?.messageCount || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

export async function getHistoricalUsageData({ userId }: { userId: string }) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 89);
    const historicalMessages = await db
      .select({ createdAt: message.createdAt, role: message.role })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(and(eq(chat.userId, userId), eq(message.role, 'user'), gte(message.createdAt, startDate), lt(message.createdAt, endDate)))
      .orderBy(asc(message.createdAt));
    const dailyCounts = new Map<string, number>();
    historicalMessages.forEach((msg) => {
      const dateKey = msg.createdAt.toISOString().split('T')[0];
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });
    const result = Array.from(dailyCounts.entries()).map(([date, count]) => ({ date: new Date(date), messageCount: count }));
    return result;
  } catch (error) {
    console.error('Error getting historical usage data:', error);
    return [];
  }
}

export async function getOrganizationUsageStatsRaw(memberIds: string[], thirtyDaysAgo: Date) {
  const messageStats = await db.select({ messageCount: sql<number>`sum(${messageUsage.messageCount})` }).from(messageUsage).where(and(inArray(messageUsage.userId, memberIds), gte(messageUsage.date, thirtyDaysAgo)));
  const extremeSearchStats = await db.select({ searchCount: sql<number>`sum(${extremeSearchUsage.searchCount})` }).from(extremeSearchUsage).where(and(inArray(extremeSearchUsage.userId, memberIds), gte(extremeSearchUsage.date, thirtyDaysAgo)));
  const dailyMessages = await db
    .select({ date: messageUsage.date, messageCount: sql<number>`sum(${messageUsage.messageCount})` })
    .from(messageUsage)
    .where(and(inArray(messageUsage.userId, memberIds), gte(messageUsage.date, thirtyDaysAgo)))
    .groupBy(messageUsage.date)
    .orderBy(asc(messageUsage.date));
  return { messageStats, extremeSearchStats, dailyMessages };
}


