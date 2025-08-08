"use server";

import { atlas } from "@/ai/providers";
import { serverEnv } from "@/env/server";
import { SearchGroupId } from "@/lib/utils";
import { generateObject, UIMessage, generateText } from "ai";
import { z } from "zod";
import { getUser, getUserWithOrganization } from "@/lib/auth-utils";
import {
  getChatsByUserId,
  deleteChatById,
  updateChatVisiblityById,
  getChatById,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatTitleById,
  getExtremeSearchCount,
  incrementMessageUsage,
  getMessageCount,
  getHistoricalUsageData,
} from "@/lib/db/queries";
import { usageCountCache, createMessageCountKey, createExtremeCountKey } from "@/lib/performance-cache";

export async function suggestQuestions(history: any[]) {
  "use server";

  const { object } = await generateObject({
    model: atlas.languageModel("atlas-nano"),
    temperature: 0,
    maxTokens: 512,
    system: `You are a search engine follow up query/questions generator. You MUST create EXACTLY 3 questions for the search engine based on the message history.

### Question Generation Guidelines:
- Create exactly 3 questions that are open-ended and encourage further discussion
- Questions must be concise (5-10 words each) but specific and contextually relevant
- Each question must contain specific nouns, entities, or clear context markers
- NEVER use pronouns (he, she, him, his, her, etc.) - always use proper nouns from the context
- Questions must be related to tools available in the system
- Questions should flow naturally from previous conversation
- You are here to generate questions for the search engine not to use tools or run tools!!
`,
    messages: history,
    schema: z.object({
      questions: z.array(z.string()).describe("The generated questions based on the message history."),
    }),
  });

  return {
    questions: object.questions,
  };
}

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
  const { text: title } = await generateText({
    model: atlas.languageModel("atlas-nano"),
    system: `
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - the title should creative and unique
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function fetchMetadata(url: string) {
  try {
    const response = await fetch(url, { next: { revalidate: serverEnv.DEFAULT_REVALIDATE_SECONDS } });
    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

    const title = titleMatch ? titleMatch[1] : "";
    const description = descMatch ? descMatch[1] : "";

    return { title, description };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
}

type LegacyGroupId = SearchGroupId | "buddy";

const groupTools = {
  web: [
    "web_search",
    "greeting",
    "get_weather_data",
    "retrieve",
    "text_translate",
    "nearby_places_search",
    "track_flight",
    "movie_or_tv_search",
    "trending_movies",
    "find_place_on_map",
    "trending_tv",
    "datetime",
    "mcp_search",
  ] as const,
  academic: ["academic_search", "code_interpreter", "datetime"] as const,
  youtube: ["youtube_search", "datetime"] as const,
  reddit: ["reddit_search", "datetime"] as const,
  analysis: ["code_interpreter", "stock_chart", "currency_converter", "datetime"] as const,
  crypto: ["coin_data", "coin_ohlc", "coin_data_by_contract", "datetime"] as const,
  chat: [] as const,
  extreme: ["extreme_search"] as const,
  x: ["x_search"] as const,
  memory: ["memory_manager", "datetime"] as const,
  buddy: ["memory_manager", "datetime"] as const,
} as const;

const groupInstructions = {
  web: `You are an AI web search engine called Atlas.`,
  memory: `You are a memory companion called Memory.`,
  x: `You are a X content expert.`,
  buddy: `You are a memory companion called Memory.`,
  academic: `You are an academic research assistant.`,
  youtube: `You are a YouTube content expert.`,
  reddit: `You are a Reddit content expert.`,
  analysis: `You are a code runner, stock analysis and currency conversion expert.`,
  chat: `You are Atlas, a helpful assistant.`,
  extreme: `You are an advanced research assistant.`,
  crypto: `You are a cryptocurrency data expert.`,
} as const;

export async function getGroupConfig(groupId: LegacyGroupId = "web") {
  "use server";

  if (groupId === "memory" || groupId === "buddy") {
    const user = await getUser();
    if (!user) {
      groupId = "web";
    } else if (groupId === "buddy") {
      const tools = groupTools[groupId];
      const instructions = groupInstructions[groupId];
      return { tools, instructions } as const;
    }
  }

  const tools = groupTools[groupId as keyof typeof groupTools];
  const instructions = groupInstructions[groupId as keyof typeof groupInstructions];
  return { tools, instructions } as const;
}

export async function getUserChats(
  userId: string,
  limit: number = 20,
  startingAfter?: string,
  endingBefore?: string,
  organizationId?: string | null,
): Promise<{ chats: any[]; hasMore: boolean }> {
  "use server";

  if (!userId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: startingAfter || null,
      endingBefore: endingBefore || null,
      organizationId,
    });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    return { chats: [], hasMore: false };
  }
}

export async function loadMoreChats(
  userId: string,
  lastChatId: string,
  limit: number = 20,
  organizationId?: string | null,
): Promise<{ chats: any[]; hasMore: boolean }> {
  "use server";

  if (!userId || !lastChatId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: null,
      endingBefore: lastChatId,
      organizationId,
    });
  } catch (error) {
    console.error("Error loading more chats:", error);
    return { chats: [], hasMore: false };
  }
}

export async function getUserMessageCount(providedUser?: any) {
  "use server";
  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: "User not found" } as const;
    }

    const cacheKey = createMessageCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      return { count: cached, error: null } as const;
    }

    const count = await getMessageCount({ userId: user.id });
    usageCountCache.set(cacheKey, count);
    return { count, error: null } as const;
  } catch (error) {
    console.error("Error getting user message count:", error);
    return { count: 0, error: "Failed to get message count" } as const;
  }
}

export async function incrementUserMessageCount() {
  "use server";
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "User not found" } as const;
    }
    await incrementMessageUsage({ userId: user.id });
    const cacheKey = createMessageCountKey(user.id);
    usageCountCache.delete(cacheKey);
    return { success: true, error: null } as const;
  } catch (error) {
    console.error("Error incrementing user message count:", error);
    return { success: false, error: "Failed to increment message count" } as const;
  }
}

export async function getExtremeSearchUsageCount(providedUser?: any) {
  "use server";
  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: "User not found" } as const;
    }

    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      return { count: cached, error: null } as const;
    }

    const count = await getExtremeSearchCount({ userId: user.id });
    usageCountCache.set(cacheKey, count);
    return { count, error: null } as const;
  } catch (error) {
    console.error("Error getting extreme search usage count:", error);
    return { count: 0, error: "Failed to get extreme search count" } as const;
  }
}

export async function getHistoricalUsage(providedUser?: any) {
  "use server";
  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return [];
    }

    const historicalData = await getHistoricalUsageData({ userId: user.id });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 89);

    const dataMap = new Map<string, number>();
    historicalData.forEach((record) => {
      const dateKey = record.date.toISOString().split("T")[0];
      dataMap.set(dateKey, record.messageCount || 0);
    });

    const completeData: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
    for (let i = 0; i < 90; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split("T")[0];

      const count = dataMap.get(dateKey) || 0;
      let level: 0 | 1 | 2 | 3 | 4;

      if (count === 0) level = 0;
      else if (count <= 3) level = 1;
      else if (count <= 7) level = 2;
      else if (count <= 12) level = 3;
      else level = 4;

      completeData.push({ date: dateKey, count, level });
    }

    return completeData;
  } catch (error) {
    console.error("Error getting historical usage:", error);
    return [];
  }
}


