'use server';

import { getUser } from '@/lib/auth-utils';
import { serverEnv } from '@/env/server';
import MemoryClient from 'mem0ai';

const memoryClient = new MemoryClient({ apiKey: serverEnv.MEM0_API_KEY || '' });

function isMem0Configured(): boolean {
  return Boolean(serverEnv.MEM0_API_KEY && serverEnv.MEM0_ORG_ID && serverEnv.MEM0_PROJECT_ID);
}

export interface MemoryItem {
  id: string;
  name?: string;
  memory?: string;
  metadata?: {
    [key: string]: any;
  };
  user_id?: string;
  owner?: string;
  immutable?: boolean;
  expiration_date?: string | null;
  created_at: string;
  updated_at: string;
  categories?: string[];
}

export interface MemoryResponse {
  memories: MemoryItem[];
  total: number;
}

/**
 * Add a memory for the authenticated user
 */
export async function addMemory(content: string) {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    if (!isMem0Configured()) {
      console.warn('[mem0] Skipping addMemory: MEM0 configuration missing');
      return { success: false, error: 'Memories are not configured' } as any;
    }
    const response = await memoryClient.add(
      [
        {
          role: 'user',
          content: content,
        },
      ],
      {
        user_id: user.id,
        org_id: serverEnv.MEM0_ORG_ID,
        project_id: serverEnv.MEM0_PROJECT_ID,
      },
    );
    return response;
  } catch (error: any) {
    console.error('Error adding memory:', error);
    // Gracefully degrade on invalid key or 401s
    if (error && typeof error.message === 'string' && error.message.includes('API request failed')) {
      return { success: false, error: 'Memories are temporarily unavailable' } as any;
    }
    throw error;
  }
}

/**
 * Search memories for the authenticated user
 * Returns a consistent MemoryResponse format with memories array and total count
 */
export async function searchMemories(query: string, page = 1, pageSize = 20): Promise<MemoryResponse> {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  if (!query.trim()) {
    return { memories: [], total: 0 };
  }

  const searchFilters = {
    AND: [{ user_id: user.id }],
  };

  try {
    if (!isMem0Configured()) {
      console.warn('[mem0] Skipping searchMemories: MEM0 configuration missing');
      return { memories: [], total: 0 };
    }
    const result = await memoryClient.search(query, {
      filters: searchFilters,
      api_version: 'v2',
    });

    console.log('[searchMemories] result', result);

    if (!result || !result[0]) {
      return { memories: [], total: 0 };
    }

    // Process the results to ensure we return a consistent structure
    if (Array.isArray(result)) {
      const memories: MemoryItem[] = result.map((item: any) => ({
        id: item.id,
        name: item.name,
        memory: item.memory,
        metadata: item.metadata,
        user_id: item.user_id,
        owner: item.owner,
        immutable: item.immutable,
        expiration_date: item.expiration_date,
        created_at: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
        updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : item.updated_at,
        categories: item.categories,
      }));
      return {
        memories,
        total: memories.length,
      };
    } else if (result && typeof result === 'object' && 'memories' in result) {
      const rawMemories = (result as any).memories || [];
      const memories: MemoryItem[] = rawMemories.map((item: any) => ({
        id: item.id,
        name: item.name,
        memory: item.memory,
        metadata: item.metadata,
        user_id: item.user_id,
        owner: item.owner,
        immutable: item.immutable,
        expiration_date: item.expiration_date,
        created_at: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
        updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : item.updated_at,
        categories: item.categories,
      }));
      return {
        memories,
        total: (result as any).total || memories.length,
      };
    }
    return { memories: [], total: 0 };
  } catch (error: any) {
    console.error('Error searching memories:', error);
    // Graceful fallback for invalid/expired API key
    return { memories: [], total: 0 };
  }
}

/**
 * Get all memories for the authenticated user
 * Returns a consistent MemoryResponse format with memories array and total count
 */
export async function getAllMemories(page = 1, pageSize = 20): Promise<MemoryResponse> {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    if (!isMem0Configured()) {
      console.warn('[mem0] Skipping getAllMemories: MEM0 configuration missing');
      return { memories: [], total: 0 };
    }
    const data = await memoryClient.getAll({
      user_id: user.id,
      org_id: serverEnv.MEM0_ORG_ID,
      project_id: serverEnv.MEM0_PROJECT_ID,
    });

    console.log('[getAllMemories] data', data);

    // Process the result to ensure we return a consistent structure
    if (Array.isArray(data)) {
      const memories: MemoryItem[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        memory: item.memory,
        metadata: item.metadata,
        user_id: item.user_id,
        owner: item.owner,
        immutable: item.immutable,
        expiration_date: item.expiration_date,
        created_at: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
        updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : item.updated_at,
        categories: item.categories,
      }));
      return {
        memories,
        total: memories.length,
      };
    } else if (data && typeof data === 'object' && 'memories' in data) {
      const rawMemories = (data as any).memories || [];
      const memories: MemoryItem[] = rawMemories.map((item: any) => ({
        id: item.id,
        name: item.name,
        memory: item.memory,
        metadata: item.metadata,
        user_id: item.user_id,
        owner: item.owner,
        immutable: item.immutable,
        expiration_date: item.expiration_date,
        created_at: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
        updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : item.updated_at,
        categories: item.categories,
      }));
      return {
        memories,
        total: (data as any).total || memories.length,
      };
    }
    return { memories: [], total: 0 };
  } catch (error: any) {
    console.error('Error getting all memories:', error);
    // Graceful fallback for invalid/expired API key
    return { memories: [], total: 0 };
  }
}

/**
 * Delete a memory by ID
 */
export async function deleteMemory(memoryId: string) {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    if (!isMem0Configured()) {
      console.warn('[mem0] Skipping deleteMemory: MEM0 configuration missing');
      return { success: false } as any;
    }
    const data = await memoryClient.delete(memoryId);
    return data;
  } catch (error: any) {
    console.error('Error deleting memory:', error);
    return { success: false } as any;
  }
}
