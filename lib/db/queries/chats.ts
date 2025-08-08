import 'server-only';
import { and, asc, desc, eq, gt, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { chat, message, stream, type Chat, type Message } from '@/lib/db/schema';

type VisibilityType = 'public' | 'private';

export async function saveChat({ id, userId, title, visibility, organizationId }: {
  id: string; userId: string; title: string; visibility: VisibilityType; organizationId?: string | null;
}) {
  try {
    return await db.insert(chat).values({ id, createdAt: new Date(), userId, title, visibility, organizationId: organizationId || null });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat' + error);
  }
}

export async function deleteChatById({ id, userId, organizationId }: { id: string; userId: string; organizationId?: string | null; }) {
  try {
    const ownershipConditions = [eq(chat.id, id), eq(chat.userId, userId)];
    if (organizationId !== undefined) {
      ownershipConditions.push(organizationId === null ? sql`${chat.organizationId} IS NULL` : eq(chat.organizationId, organizationId));
    }
    const [chatWithVerifiedOwnership] = await db.select().from(chat).where(and(...ownershipConditions));
    if (!chatWithVerifiedOwnership) {
      throw new ChatSDKError('not_found:database', 'Chat not found or access denied');
    }
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));
    const [deletedChat] = await db.delete(chat).where(eq(chat.id, id)).returning();
    return deletedChat;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}

export async function getChatsByUserId({ id, limit, startingAfter, endingBefore, organizationId }: { id: string; limit: number; startingAfter: string | null; endingBefore: string | null; organizationId?: string | null; }) {
  try {
    const extendedLimit = limit + 1;
    const query = (whereCondition?: SQL<any>) => {
      const baseConditions = [eq(chat.userId, id)];
      if (organizationId !== undefined) {
        baseConditions.push(organizationId === null ? sql`${chat.organizationId} IS NULL` : eq(chat.organizationId, organizationId));
      }
      const combinedConditions = whereCondition ? and(whereCondition, ...baseConditions) : and(...baseConditions);
      return db.select().from(chat).where(combinedConditions).orderBy(desc(chat.createdAt)).limit(extendedLimit);
    };
    let filteredChats: Array<Chat> = [];
    if (startingAfter) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, startingAfter)).limit(1);
      if (!selectedChat) throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, endingBefore)).limit(1);
      if (!selectedChat) throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }
    const hasMore = filteredChats.length > limit;
    return { chats: hasMore ? filteredChats.slice(0, limit) : filteredChats, hasMore };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id');
  }
}

export async function getChatById({ id, userId, organizationId }: { id: string; userId?: string; organizationId?: string | null; }) {
  try {
    const searchConditions = [eq(chat.id, id)];
    if (userId) searchConditions.push(eq(chat.userId, userId));
    if (organizationId !== undefined) {
      searchConditions.push(organizationId === null ? sql`${chat.organizationId} IS NULL` : eq(chat.organizationId, organizationId));
    }
    const [foundChat] = await db.select().from(chat).where(and(...searchConditions));
    return foundChat;
  } catch (error) {
    console.log('Error getting chat by id', error);
    return null;
  }
}

export async function getChatWithUserById({ id }: { id: string }) {
  try {
    const [result] = await db
      .select({ id: chat.id, title: chat.title, createdAt: chat.createdAt, updatedAt: chat.updatedAt, visibility: chat.visibility, userId: chat.userId })
      .from(chat)
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

export async function getMessagesByChatId({ id, limit = 50, offset = 0 }: { id: string; limit?: number; offset?: number; }) {
  'use cache';
  try {
    return await db.select().from(message).where(eq(message.chatId, id)).orderBy(asc(message.createdAt)).limit(limit).offset(offset);
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
    const messagesToDelete = await db.select({ id: message.id }).from(message).where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
    const messageIds = messagesToDelete.map((m) => m.id);
    if (messageIds.length > 0) {
      return await db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete messages by chat id after timestamp');
  }
}

export async function updateChatVisiblityById({ chatId, visibility, userId, organizationId }: { chatId: string; visibility: 'private' | 'public'; userId: string; organizationId?: string | null; }) {
  try {
    const accessVerification = [eq(chat.id, chatId), eq(chat.userId, userId)];
    if (organizationId !== undefined) {
      accessVerification.push(organizationId === null ? sql`${chat.organizationId} IS NULL` : eq(chat.organizationId, organizationId));
    }
    const [authorizedChat] = await db.select().from(chat).where(and(...accessVerification));
    if (!authorizedChat) {
      throw new ChatSDKError('not_found:database', 'Chat not found or access denied');
    }
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update chat visibility by id');
  }
}

export async function updateChatTitleById({ chatId, title, userId, organizationId }: { chatId: string; title: string; userId: string; organizationId?: string | null; }) {
  try {
    const ownershipValidation = [eq(chat.id, chatId), eq(chat.userId, userId)];
    if (organizationId !== undefined) {
      ownershipValidation.push(organizationId === null ? sql`${chat.organizationId} IS NULL` : eq(chat.organizationId, organizationId));
    }
    const [verifiedChat] = await db.select().from(chat).where(and(...ownershipValidation));
    if (!verifiedChat) {
      throw new ChatSDKError('not_found:database', 'Chat not found or access denied');
    }
    const [renamedChat] = await db.update(chat).set({ title, updatedAt: new Date() }).where(eq(chat.id, chatId)).returning();
    return renamedChat;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update chat title by id');
  }
}


