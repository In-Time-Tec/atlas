import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { organizationMember, user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await context.params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const userMembership = await db.query.organizationMember.findFirst({
      where: and(eq(organizationMember.organizationId, organizationId), eq(organizationMember.userId, session.user.id)),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    const members = await db
      .select({
        id: organizationMember.id,
        userId: organizationMember.userId,
        role: organizationMember.role,
        joinedAt: organizationMember.createdAt,
        email: user.email,
        name: user.name,
      })
      .from(organizationMember)
      .leftJoin(user, eq(organizationMember.userId, user.id))
      .where(eq(organizationMember.organizationId, organizationId));

    const formattedMembers = members.map((member) => ({
      id: member.userId || member.id,
      email: member.email || '',
      name: member.name || undefined,
      role: member.role as 'member' | 'admin' | 'owner',
      joinedAt: member.joinedAt,
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error('Failed to fetch organization members:', error);
    return NextResponse.json({ error: 'Failed to fetch organization members' }, { status: 500 });
  }
}
