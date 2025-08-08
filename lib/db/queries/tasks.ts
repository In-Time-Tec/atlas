import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';

export async function createTask({ userId, organizationId, title, prompt, frequency, cronSchedule, timezone, nextRunAt, qstashScheduleId, }: { userId: string; organizationId?: string | null; title: string; prompt: string; frequency: string; cronSchedule: string; timezone: string; nextRunAt: Date; qstashScheduleId?: string; }) {
  try {
    const [newTask] = await db.insert(tasks).values({ userId, organizationId, title, prompt, frequency, cronSchedule, timezone, nextRunAt, qstashScheduleId }).returning();
    return newTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create task');
  }
}

export async function getTasksByUserId({ userId, organizationId }: { userId: string; organizationId?: string | null }) {
  try {
    const whereConditions = [eq(tasks.userId, userId)];
    if (organizationId !== undefined) {
      if (organizationId === null) whereConditions.push(sql`${tasks.organizationId} IS NULL`);
      else whereConditions.push(eq(tasks.organizationId, organizationId));
    }
    return await db.select().from(tasks).where(and(...whereConditions)).orderBy(desc(tasks.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get tasks by user id');
  }
}

export async function getTaskById({ id, userId, organizationId }: { id: string; userId?: string; organizationId?: string | null; }) {
  try {
    const searchConditions = [eq(tasks.id, id)];
    if (userId) searchConditions.push(eq(tasks.userId, userId));
    if (organizationId !== undefined) searchConditions.push(organizationId === null ? sql`${tasks.organizationId} IS NULL` : eq(tasks.organizationId, organizationId));
    const [selectedTask] = await db.select().from(tasks).where(and(...searchConditions));
    return selectedTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get task by id');
  }
}

export async function updateTask({ id, userId, organizationId, title, prompt, frequency, cronSchedule, timezone, nextRunAt, qstashScheduleId, }: { id: string; userId: string; organizationId?: string | null; title?: string; prompt?: string; frequency?: string; cronSchedule?: string; timezone?: string; nextRunAt?: Date; qstashScheduleId?: string; }) {
  try {
    const ownershipConditions = [eq(tasks.id, id), eq(tasks.userId, userId)];
    if (organizationId !== undefined) ownershipConditions.push(organizationId === null ? sql`${tasks.organizationId} IS NULL` : eq(tasks.organizationId, organizationId));
    const [taskWithVerifiedOwnership] = await db.select().from(tasks).where(and(...ownershipConditions));
    if (!taskWithVerifiedOwnership) throw new ChatSDKError('not_found:database', 'Task not found or access denied');
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
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update task');
  }
}

export async function updateTaskStatus({ id, userId, organizationId, status, }: { id: string; userId: string; organizationId?: string | null; status: 'active' | 'paused' | 'archived' | 'running'; }) {
  try {
    const ownershipConditions = [eq(tasks.id, id), eq(tasks.userId, userId)];
    if (organizationId !== undefined) ownershipConditions.push(organizationId === null ? sql`${tasks.organizationId} IS NULL` : eq(tasks.organizationId, organizationId));
    const [taskWithVerifiedOwnership] = await db.select().from(tasks).where(and(...ownershipConditions));
    if (!taskWithVerifiedOwnership) throw new ChatSDKError('not_found:database', 'Task not found or access denied');
    const [updatedTask] = await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return updatedTask;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update task status');
  }
}

export async function updateTaskLastRun({ id, userId, organizationId, lastRunAt, lastRunChatId, nextRunAt, runStatus = 'success', error, duration, tokensUsed, searchesPerformed, }: { id: string; userId: string; organizationId?: string | null; lastRunAt: Date; lastRunChatId: string; nextRunAt?: Date; runStatus?: 'success' | 'error' | 'timeout'; error?: string; duration?: number; tokensUsed?: number; searchesPerformed?: number; }) {
  try {
    const currentTask = await getTaskById({ id, userId, organizationId });
    if (!currentTask) throw new Error('Task not found');
    const currentHistory = (currentTask.runHistory as any[]) || [];
    const newRun = { runAt: lastRunAt.toISOString(), chatId: lastRunChatId, status: runStatus, ...(error && { error }), ...(duration && { duration }), ...(tokensUsed && { tokensUsed }), ...(searchesPerformed && { searchesPerformed }) };
    const updatedHistory = [...currentHistory, newRun].slice(-100);
    const updateData: any = { lastRunAt, lastRunChatId, runHistory: updatedHistory, updatedAt: new Date() };
    if (nextRunAt) updateData.nextRunAt = nextRunAt;
    const [updatedTask] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return updatedTask;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update task last run');
  }
}

export async function getTaskRunStats({ id, userId, organizationId }: { id: string; userId?: string; organizationId?: string | null; }) {
  try {
    const task = await getTaskById({ id, userId, organizationId });
    if (!task) return null;
    const runHistory = (task.runHistory as any[]) || [];
    return {
      totalRuns: runHistory.length,
      successfulRuns: runHistory.filter((run) => run.status === 'success').length,
      failedRuns: runHistory.filter((run) => run.status === 'error').length,
      averageDuration: runHistory.reduce((sum, run) => sum + (run.duration || 0), 0) / runHistory.length || 0,
      lastWeekRuns: runHistory.filter((run) => new Date(run.runAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    };
  } catch (error) {
    console.error('Error getting task run stats:', error);
    return null;
  }
}

export async function deleteTask({ id, userId, organizationId }: { id: string; userId: string; organizationId?: string | null; }) {
  try {
    const ownershipConditions = [eq(tasks.id, id), eq(tasks.userId, userId)];
    if (organizationId !== undefined) ownershipConditions.push(organizationId === null ? sql`${tasks.organizationId} IS NULL` : eq(tasks.organizationId, organizationId));
    const [taskWithVerifiedOwnership] = await db.select().from(tasks).where(and(...ownershipConditions));
    if (!taskWithVerifiedOwnership) throw new ChatSDKError('not_found:database', 'Task not found or access denied');
    const [deletedTask] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return deletedTask;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete task');
  }
}


