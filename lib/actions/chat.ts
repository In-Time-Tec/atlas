"use server";

import { getUserWithOrganization } from "@/lib/auth-utils";
import {
  getChatsByUserId,
  deleteChatById,
  updateChatVisiblityById,
  getChatById,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatTitleById,
} from "@/lib/db/queries";

export async function deleteChat(chatId: string) {
  "use server";

  if (!chatId) return null;

  try {
    const { user, activeOrganization } = await getUserWithOrganization();

    if (!user) {
      console.error("No authenticated user for deleteChat");
      return null;
    }

    return await deleteChatById({
      id: chatId,
      userId: user.id,
      organizationId: activeOrganization?.id || null,
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return null;
  }
}

export async function updateChatVisibility(chatId: string, visibility: "private" | "public") {
  "use server";

  if (!chatId) return null;

  try {
    const { user, activeOrganization } = await getUserWithOrganization();
    if (!user) {
      console.error("No authenticated user for updateChatVisibility");
      return null;
    }

    return await updateChatVisiblityById({
      chatId,
      visibility,
      userId: user.id,
      organizationId: activeOrganization?.id || null,
    });
  } catch (error) {
    console.error("Error updating chat visibility:", error);
    return null;
  }
}

export async function getChatInfo(chatId: string) {
  "use server";

  if (!chatId) return null;

  try {
    const { user, activeOrganization } = await getUserWithOrganization();
    return await getChatById({
      id: chatId,
      userId: user?.id,
      organizationId: activeOrganization?.id || null,
    });
  } catch (error) {
    console.error("Error getting chat info:", error);
    return null;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  "use server";
  try {
    const [message] = await getMessageById({ id });
    if (!message) {
      console.error(`No message found with id: ${id}`);
      return;
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  } catch (error) {
    console.error(`Error deleting trailing messages: ${error}`);
    throw error;
  }
}

export async function updateChatTitle(chatId: string, title: string) {
  "use server";

  if (!chatId || !title.trim()) return null;

  try {
    const { user, activeOrganization } = await getUserWithOrganization();

    if (!user) {
      console.error("No authenticated user for updateChatTitle");
      return null;
    }

    return await updateChatTitleById({
      chatId,
      title: title.trim(),
      userId: user.id,
      organizationId: activeOrganization?.id || null,
    });
  } catch (error) {
    console.error("Error updating chat title:", error);
    return null;
  }
}


