import 'server-only';
import { eq } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { customInstructions } from '@/lib/db/schema';

export async function getCustomInstructionsByUserId({ userId }: { userId: string }) {
  try {
    const [instructions] = await db.select().from(customInstructions).where(eq(customInstructions.userId, userId)).limit(1);
    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function createCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [newInstructions] = await db.insert(customInstructions).values({ userId, content }).returning();
    return newInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create custom instructions');
  }
}

export async function updateCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [updatedInstructions] = await db
      .update(customInstructions)
      .set({ content, updatedAt: new Date() })
      .where(eq(customInstructions.userId, userId))
      .returning();
    return updatedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update custom instructions');
  }
}

export async function deleteCustomInstructions({ userId }: { userId: string }) {
  try {
    const [deletedInstructions] = await db.delete(customInstructions).where(eq(customInstructions.userId, userId)).returning();
    return deletedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete custom instructions');
  }
}


