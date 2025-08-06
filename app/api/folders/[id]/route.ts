import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileFolder } from '@/lib/db/schema';
import { canUserAccessOrganizationFiles, canUserModifyOrganizationFiles } from '@/lib/organization-utils';

const FolderUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const folderId = params.id;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (organizationId) {
      const hasAccess = await canUserAccessOrganizationFiles(session.user.id, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to organization folders' }, { status: 403 });
      }
    }

    const whereConditions = organizationId
      ? [eq(fileFolder.id, folderId), eq(fileFolder.organizationId, organizationId)]
      : [eq(fileFolder.id, folderId), eq(fileFolder.userId, session.user.id)];

    const folder = await db
      .select()
      .from(fileFolder)
      .where(and(...whereConditions))
      .limit(1);

    if (!folder.length) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder[0]);
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ error: 'Failed to fetch folder' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const folderId = params.id;
    const body = await request.json();
    const organizationId = body.organizationId;

    if (organizationId) {
      const canModify = await canUserModifyOrganizationFiles(session.user.id, organizationId);
      if (!canModify) {
        return NextResponse.json({ error: 'Access denied to modify organization folders' }, { status: 403 });
      }
    }

    const validatedData = FolderUpdateSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validatedData.error.errors }, { status: 400 });
    }

    const { name, parentId, color, icon } = validatedData.data;

    const whereConditions = organizationId
      ? [eq(fileFolder.id, folderId), eq(fileFolder.organizationId, organizationId)]
      : [eq(fileFolder.id, folderId), eq(fileFolder.userId, session.user.id)];

    const existingFolder = await db
      .select()
      .from(fileFolder)
      .where(and(...whereConditions))
      .limit(1);

    if (!existingFolder.length) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (parentId) {
      const parentConditions = organizationId
        ? [eq(fileFolder.id, parentId), eq(fileFolder.organizationId, organizationId)]
        : [eq(fileFolder.id, parentId), eq(fileFolder.userId, session.user.id)];

      const parentFolder = await db
        .select()
        .from(fileFolder)
        .where(and(...parentConditions))
        .limit(1);

      if (!parentFolder.length) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }

      if (parentId === folderId) {
        return NextResponse.json({ error: 'A folder cannot be its own parent' }, { status: 400 });
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const [updatedFolder] = await db
      .update(fileFolder)
      .set(updateData)
      .where(and(...whereConditions))
      .returning();

    if (!updatedFolder) {
      return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
    }

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const folderId = params.id;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (organizationId) {
      const canModify = await canUserModifyOrganizationFiles(session.user.id, organizationId);
      if (!canModify) {
        return NextResponse.json({ error: 'Access denied to delete organization folders' }, { status: 403 });
      }
    }

    const whereConditions = organizationId
      ? [eq(fileFolder.id, folderId), eq(fileFolder.organizationId, organizationId)]
      : [eq(fileFolder.id, folderId), eq(fileFolder.userId, session.user.id)];

    const existingFolder = await db
      .select()
      .from(fileFolder)
      .where(and(...whereConditions))
      .limit(1);

    if (!existingFolder.length) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    await db.delete(fileFolder).where(and(...whereConditions));

    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
