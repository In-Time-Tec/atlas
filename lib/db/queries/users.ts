import 'server-only';
import { eq } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { user, type User } from '@/lib/db/schema';

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


