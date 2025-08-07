import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userOrganizationSession, organizationMember } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const SERVER_ERROR_STATUS = 500;

async function verifyUserMembership(organizationId: string, userId: string) {
  return await db.query.organizationMember.findFirst({
    where: and(eq(organizationMember.organizationId, organizationId), eq(organizationMember.userId, userId)),
  });
}

async function updateUserOrganizationSession(userId: string, organizationId: string | null) {
  await db
    .insert(userOrganizationSession)
    .values({
      userId,
      activeOrganizationId: organizationId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userOrganizationSession.userId,
      set: {
        activeOrganizationId: organizationId,
        updatedAt: new Date(),
      },
    });
}

async function invalidateUserCache(userId: string) {
  const { clearUserDataCache } = await import('@/lib/user-data-server');
  clearUserDataCache(userId);
}

function createSuccessResponse(organizationId: string | null) {
  const isPersonalContext = !organizationId;
  return NextResponse.json({
    success: true,
    activeOrganizationId: organizationId,
    message: isPersonalContext ? 'Switched to personal' : 'Switched to organization',
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: UNAUTHORIZED_STATUS });
    }

    const { organizationId } = await request.json();

    if (organizationId) {
      const membership = await verifyUserMembership(organizationId, session.user.id);

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this organization' }, { status: FORBIDDEN_STATUS });
      }
    }

    await updateUserOrganizationSession(session.user.id, organizationId || null);
    await invalidateUserCache(session.user.id);

    return createSuccessResponse(organizationId || null);
  } catch (error) {
    console.error('Failed to set active organization:', error);
    return NextResponse.json({ error: 'Failed to set active organization' }, { status: SERVER_ERROR_STATUS });
  }
}

// Provide current context for client consumption
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ activeOrganization: null });
    }

    // Reuse server util to ensure membership validity
    const { getUserWithOrganization } = await import('@/lib/auth-utils');
    const { activeOrganization } = await getUserWithOrganization();
    return NextResponse.json({ activeOrganization });
  } catch (error) {
    console.error('Failed to load active organization:', error);
    return NextResponse.json({ activeOrganization: null });
  }
}
