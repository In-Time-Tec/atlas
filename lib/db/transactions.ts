import { db } from '@/lib/db';

export async function withTransaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    return fn(tx as unknown as typeof db);
  });
}


