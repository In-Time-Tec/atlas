import 'server-only';
import { and, asc, desc, eq, gt, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import {
  user,
  chat,
  type User,
  message,
  type Message,
  type Chat,
  stream,
  extremeSearchUsage,
  messageUsage,
  customInstructions,
  payment,
  tasks,
  organization,
  organizationMember,
  type Organization,
  type OrganizationMember,
} from './schema';
import { ChatSDKError } from '../errors';
import { db } from './index';
import { getDodoPayments, setDodoPayments, getDodoProStatus, setDodoProStatus } from '../performance-cache';
type VisibilityType = 'public' | 'private';
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by email');
  }
}
export async function getUserById(id: string): Promise<User | null> {
  try {
    const [selectedUser] = await db.select().from(user).where(eq(user.id, id));
    return selectedUser || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by id');
  }
}
export async function saveChat({
  id,
  userId,
  title,
  visibility,
  organizationId,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  organizationId?: string | null;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      organizationId: organizationId || null,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat' + error);
  }
}
export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));
    const [chatsDeleted] = await db.delete(chat).where(eq(chat.id, id)).returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}
export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
  organizationId,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
  organizationId?: string | null;
}) {
  try {
    const extendedLimit = limit + 1;
    const query = (whereCondition?: SQL<any>) => {
      const baseConditions = [eq(chat.userId, id)];

      if (organizationId !== undefined) {
        baseConditions.push(
          organizationId === null ? sql`${chat.organizationId} IS NULL` : eq(chat.organizationId, organizationId),
        );
      }

      const combinedConditions = whereCondition ? and(whereCondition, ...baseConditions) : and(...baseConditions);

      return db.select().from(chat).where(combinedConditions).orderBy(desc(chat.createdAt)).limit(extendedLimit);
    };
    let filteredChats: Array<Chat> = [];
    if (startingAfter) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, startingAfter)).limit(1);
      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
      }
      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, endingBefore)).limit(1);
      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
      }
      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }
    const hasMore = filteredChats.length > limit;
    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id');
  }
}
export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.log('Error getting chat by id', error);
    return null;
  }
}
export async function getChatWithUserById({ id }: { id: string }) {
  try {
    const [result] = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        visibility: chat.visibility,
        userId: chat.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(eq(chat.id, id));
    return result;
  } catch (error) {
    console.log('Error getting chat with user by id', error);
    return null;
  }
}
export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}
export async function getMessagesByChatId({
  id,
  limit = 50,
  offset = 0,
}: {
  id: string;
  limit?: number;
  offset?: number;
}) {
  'use cache';
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
  }
}
export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id');
  }
}
export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
    const messageIds = messagesToDelete.map((message) => message.id);
    if (messageIds.length > 0) {
      return await db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete messages by chat id after timestamp');
  }
}
export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });
  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat visibility by id');
  }
}
export async function updateChatTitleById({ chatId, title }: { chatId: string; title: string }) {
  try {
    const [updatedChat] = await db
      .update(chat)
      .set({ title, updatedAt: new Date() })
      .where(eq(chat.id, chatId))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat title by id');
  }
}
export async function getMessageCountByUserId({ id, differenceInHours }: { id: string; differenceInHours: number }) {
  try {
    return await getMessageCount({ userId: id });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message count by user id');
  }
}
export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
  try {
    await db.insert(stream).values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id');
  }
}
export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();
    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get stream ids by chat id');
  }
}
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
      .where(
        and(
          eq(extremeSearchUsage.userId, userId),
          gte(extremeSearchUsage.date, startOfMonth),
          lt(extremeSearchUsage.date, startOfNextMonth),
        ),
      )
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
      const [updatedUsage] = await db
        .update(extremeSearchUsage)
        .set({
          searchCount: existingUsage.searchCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(extremeSearchUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db
        .insert(extremeSearchUsage)
        .values({
          userId,
          searchCount: 1,
          date: today,
          resetAt: endOfMonth,
        })
        .returning();
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
      .where(
        and(eq(messageUsage.userId, userId), gte(messageUsage.date, startOfDay), lt(messageUsage.date, startOfNextDay)),
      )
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
      const [updatedUsage] = await db
        .update(messageUsage)
        .set({
          messageCount: existingUsage.messageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(messageUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db
        .insert(messageUsage)
        .values({
          userId,
          messageCount: 1,
          date: today,
          resetAt: endOfDay,
        })
        .returning();
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
      .select({
        createdAt: message.createdAt,
        role: message.role,
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          eq(message.role, 'user'),
          gte(message.createdAt, startDate),
          lt(message.createdAt, endDate),
        ),
      )
      .orderBy(asc(message.createdAt));
    const dailyCounts = new Map<string, number>();
    historicalMessages.forEach((msg) => {
      const dateKey = msg.createdAt.toISOString().split('T')[0];
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });
    const result = Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date: new Date(date),
      messageCount: count,
    }));
    return result;
  } catch (error) {
    console.error('Error getting historical usage data:', error);
    return [];
  }
}
export async function getCustomInstructionsByUserId({ userId }: { userId: string }) {
  try {
    const [instructions] = await db
      .select()
      .from(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .limit(1);
    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}
export async function createCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [newInstructions] = await db
      .insert(customInstructions)
      .values({
        userId,
        content,
      })
      .returning();
    return newInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create custom instructions');
  }
}
export async function updateCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [updatedInstructions] = await db
      .update(customInstructions)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(customInstructions.userId, userId))
      .returning();
    return updatedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update custom instructions');
  }
}
export async function deleteCustomInstructions({ userId }: { userId: string }) {
  try {
    const [deletedInstructions] = await db
      .delete(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .returning();
    return deletedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete custom instructions');
  }
}
export async function getPaymentsByUserId({ userId }: { userId: string }) {
  try {
    const cachedPayments = getDodoPayments(userId);
    if (cachedPayments) {
      return cachedPayments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const payments = await db.select().from(payment).where(eq(payment.userId, userId)).orderBy(desc(payment.createdAt));
    setDodoPayments(userId, payments);
    return payments;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get payments by user id');
  }
}
export async function getPaymentById({ paymentId }: { paymentId: string }) {
  try {
    const [selectedPayment] = await db.select().from(payment).where(eq(payment.id, paymentId));
    return selectedPayment;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get payment by id');
  }
}
export async function getSuccessfulPaymentsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(payment)
      .where(and(eq(payment.userId, userId), eq(payment.status, 'succeeded')))
      .orderBy(desc(payment.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get successful payments by user id');
  }
}
export async function getTotalPaymentAmountByUserId({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    return payments.reduce((total, payment) => total + (payment.totalAmount || 0), 0);
  } catch (error) {
    console.error('Error getting total payment amount:', error);
    return 0;
  }
}
export async function hasSuccessfulDodoPayment({ userId }: { userId: string }) {
  try {
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      return cachedStatus.hasPayments || false;
    }
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    const hasPayments = payments.length > 0;
    const statusData = { hasPayments, isProUser: false };
    setDodoProStatus(userId, statusData);
    return hasPayments;
  } catch (error) {
    console.error('Error checking DodoPayments status:', error);
    return false;
  }
}
export async function isDodoPaymentsProExpired({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    if (payments.length === 0) {
      return true;
    }
    const mostRecentPayment = payments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const paymentDate = new Date(mostRecentPayment.createdAt);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return paymentDate <= oneMonthAgo;
  } catch (error) {
    console.error('Error checking DodoPayments expiration:', error);
    return true;
  }
}
export async function getDodoPaymentsExpirationInfo({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    if (payments.length === 0) {
      return null;
    }
    const mostRecentPayment = payments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const expirationDate = new Date(mostRecentPayment.createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + 1);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      paymentDate: mostRecentPayment.createdAt,
      expirationDate,
      daysUntilExpiration,
      isExpired: daysUntilExpiration <= 0,
      isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0,
    };
  } catch (error) {
    console.error('Error getting DodoPayments expiration info:', error);
    return null;
  }
}
export async function createTask({
  userId,
  organizationId,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
}: {
  userId: string;
  organizationId?: string | null;
  title: string;
  prompt: string;
  frequency: string;
  cronSchedule: string;
  timezone: string;
  nextRunAt: Date;
  qstashScheduleId?: string;
}) {
  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        userId,
        organizationId,
        title,
        prompt,
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
        qstashScheduleId,
      })
      .returning();
    console.log(
      '✅ Created task with ID:',
      newTask.id,
      'for user:',
      userId,
      organizationId ? `in organization: ${organizationId}` : '(personal)',
    );
    return newTask;
  } catch (error) {
    console.error('❌ Failed to create task:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create task');
  }
}
export async function getTasksByUserId({ userId, organizationId }: { userId: string; organizationId?: string | null }) {
  try {
    const whereConditions = [eq(tasks.userId, userId)];

    if (organizationId !== undefined) {
      if (organizationId === null) {
        whereConditions.push(sql`${tasks.organizationId} IS NULL`);
      } else {
        whereConditions.push(eq(tasks.organizationId, organizationId));
      }
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get tasks by user id');
  }
}
export async function getTaskById({ id }: { id: string }) {
  try {
    console.log('🔍 Looking up task with ID:', id);
    const [selectedTask] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (selectedTask) {
      console.log('✅ Found task:', selectedTask.id, selectedTask.title);
    } else {
      console.log('❌ No task found with ID:', id);
    }
    return selectedTask;
  } catch (error) {
    console.error('❌ Error fetching task by ID:', id, error);
    throw new ChatSDKError('bad_request:database', 'Failed to get task by id');
  }
}
export async function updateTask({
  id,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
}: {
  id: string;
  title?: string;
  prompt?: string;
  frequency?: string;
  cronSchedule?: string;
  timezone?: string;
  nextRunAt?: Date;
  qstashScheduleId?: string;
}) {
  try {
    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (cronSchedule !== undefined) updateData.cronSchedule = cronSchedule;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (nextRunAt !== undefined) updateData.nextRunAt = nextRunAt;
    if (qstashScheduleId !== undefined) updateData.qstashScheduleId = qstashScheduleId;
    const [updatedTask] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return updatedTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update task');
  }
}
export async function updateTaskStatus({
  id,
  status,
}: {
  id: string;
  status: 'active' | 'paused' | 'archived' | 'running';
}) {
  try {
    const [updatedTask] = await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update task status');
  }
}
export async function updateTaskLastRun({
  id,
  lastRunAt,
  lastRunChatId,
  nextRunAt,
  runStatus = 'success',
  error,
  duration,
  tokensUsed,
  searchesPerformed,
}: {
  id: string;
  lastRunAt: Date;
  lastRunChatId: string;
  nextRunAt?: Date;
  runStatus?: 'success' | 'error' | 'timeout';
  error?: string;
  duration?: number;
  tokensUsed?: number;
  searchesPerformed?: number;
}) {
  try {
    const currentTask = await getTaskById({ id });
    if (!currentTask) {
      throw new Error('Task not found');
    }
    const currentHistory = (currentTask.runHistory as any[]) || [];
    const newRun = {
      runAt: lastRunAt.toISOString(),
      chatId: lastRunChatId,
      status: runStatus,
      ...(error && { error }),
      ...(duration && { duration }),
      ...(tokensUsed && { tokensUsed }),
      ...(searchesPerformed && { searchesPerformed }),
    };
    const updatedHistory = [...currentHistory, newRun].slice(-100);
    const updateData: any = {
      lastRunAt,
      lastRunChatId,
      runHistory: updatedHistory,
      updatedAt: new Date(),
    };
    if (nextRunAt) updateData.nextRunAt = nextRunAt;
    const [updatedTask] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return updatedTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update task last run');
  }
}
export async function getTaskRunStats({ id }: { id: string }) {
  try {
    const task = await getTaskById({ id });
    if (!task) return null;
    const runHistory = (task.runHistory as any[]) || [];
    return {
      totalRuns: runHistory.length,
      successfulRuns: runHistory.filter((run) => run.status === 'success').length,
      failedRuns: runHistory.filter((run) => run.status === 'error').length,
      averageDuration: runHistory.reduce((sum, run) => sum + (run.duration || 0), 0) / runHistory.length || 0,
      lastWeekRuns: runHistory.filter((run) => new Date(run.runAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length,
    };
  } catch (error) {
    console.error('Error getting task run stats:', error);
    return null;
  }
}
export async function deleteTask({ id }: { id: string }) {
  try {
    const [deletedTask] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return deletedTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete task');
  }
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  try {
    const [org] = await db.select().from(organization).where(eq(organization.id, id));
    return org || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get organization by id');
  }
}

export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  try {
    return await db.select().from(organizationMember).where(eq(organizationMember.organizationId, organizationId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get organization members');
  }
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  try {
    const memberships = await db.select().from(organizationMember).where(eq(organizationMember.userId, userId));

    if (memberships.length === 0) {
      return [];
    }

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
      return {
        totalMessages: 0,
        totalExtremeSearches: 0,
        memberCount: 0,
        dailyMessages: [],
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messageStats = await db
      .select({
        messageCount: sql<number>`sum(${messageUsage.messageCount})`,
      })
      .from(messageUsage)
      .where(and(inArray(messageUsage.userId, memberIds), gte(messageUsage.date, thirtyDaysAgo)));

    const extremeSearchStats = await db
      .select({
        searchCount: sql<number>`sum(${extremeSearchUsage.searchCount})`,
      })
      .from(extremeSearchUsage)
      .where(and(inArray(extremeSearchUsage.userId, memberIds), gte(extremeSearchUsage.date, thirtyDaysAgo)));

    const dailyMessages = await db
      .select({
        date: messageUsage.date,
        messageCount: sql<number>`sum(${messageUsage.messageCount})`,
      })
      .from(messageUsage)
      .where(and(inArray(messageUsage.userId, memberIds), gte(messageUsage.date, thirtyDaysAgo)))
      .groupBy(messageUsage.date)
      .orderBy(asc(messageUsage.date));

    return {
      totalMessages: messageStats[0]?.messageCount || 0,
      totalExtremeSearches: extremeSearchStats[0]?.searchCount || 0,
      memberCount: members.length,
      dailyMessages,
    };
  } catch (error) {
    console.error('Error getting organization usage stats:', error);
    return {
      totalMessages: 0,
      totalExtremeSearches: 0,
      memberCount: 0,
      dailyMessages: [],
    };
  }
}
