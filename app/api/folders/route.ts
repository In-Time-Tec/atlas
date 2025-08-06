import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileFolder } from '@/lib/db/schema';
import { generateId } from 'ai';
import { canUserAccessOrganizationFiles, canUserModifyOrganizationFiles } from '@/lib/organization-utils';

const FolderCreateSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const FolderListQuerySchema = z.object({
  parentId: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  organizationId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = FolderListQuerySchema.safeParse(queryParams);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedParams.error.errors },
        { status: 400 },
      );
    }

    const { parentId, sortBy, sortOrder, organizationId } = validatedParams.data;

    let whereConditions = [];

    if (organizationId) {
      const hasAccess = await canUserAccessOrganizationFiles(session.user.id, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to organization folders' }, { status: 403 });
      }
      whereConditions.push(eq(fileFolder.organizationId, organizationId));
    } else {
      whereConditions.push(eq(fileFolder.userId, session.user.id));
      whereConditions.push(isNull(fileFolder.organizationId));
    }

    if (parentId) {
      whereConditions.push(eq(fileFolder.parentId, parentId));
    } else {
      whereConditions.push(isNull(fileFolder.parentId));
    }

    const orderByColumn = sortBy === 'name' ? fileFolder.name : fileFolder.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const folders = await db
      .select({
        id: fileFolder.id,
        name: fileFolder.name,
        parentId: fileFolder.parentId,
        color: fileFolder.color,
        icon: fileFolder.icon,
        createdAt: fileFolder.createdAt,
        updatedAt: fileFolder.updatedAt,
      })
      .from(fileFolder)
      .where(and(...whereConditions))
      .orderBy(orderDirection(orderByColumn));

    return NextResponse.json({
      folders,
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = body.organizationId;

    if (organizationId) {
      const canModify = await canUserModifyOrganizationFiles(session.user.id, organizationId);
      if (!canModify) {
        return NextResponse.json({ error: 'Access denied to create organization folders' }, { status: 403 });
      }
    }

    const validatedData = FolderCreateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid folder data', details: validatedData.error.errors }, { status: 400 });
    }

    const { name, parentId, color, icon } = validatedData.data;

    if (parentId) {
      const folderConditions = organizationId
        ? [eq(fileFolder.id, parentId), eq(fileFolder.organizationId, organizationId)]
        : [eq(fileFolder.id, parentId), eq(fileFolder.userId, session.user.id)];

      const parentFolder = await db
        .select()
        .from(fileFolder)
        .where(and(...folderConditions))
        .limit(1);

      if (!parentFolder.length) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
    }

    const folderRecord = {
      id: generateId(),
      userId: session.user.id,
      organizationId: organizationId || null,
      name,
      parentId: parentId || null,
      color: color || null,
      icon: icon || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(fileFolder).values(folderRecord);

    return NextResponse.json({
      id: folderRecord.id,
      name: folderRecord.name,
      parentId: folderRecord.parentId,
      color: folderRecord.color,
      icon: folderRecord.icon,
      createdAt: folderRecord.createdAt,
      updatedAt: folderRecord.updatedAt,
      organizationId: folderRecord.organizationId,
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
