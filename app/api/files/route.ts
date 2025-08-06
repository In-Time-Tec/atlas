import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq, ilike, or, sql, isNull } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileLibrary, fileFolder } from '@/lib/db/schema';
import { generateId } from 'ai';
import { canUserAccessOrganizationFiles, canUserModifyOrganizationFiles } from '@/lib/organization-utils';

const FileUploadSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size should be less than 10MB',
    })
    .refine(
      (file) => {
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        return validTypes.includes(file.type);
      },
      {
        message: 'File type not supported',
      },
    ),
  folderId: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const FileListQuerySchema = z.object({
  folderId: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'filename', 'size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
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

    const validatedParams = FileListQuerySchema.safeParse(queryParams);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedParams.error.errors },
        { status: 400 },
      );
    }

    const { folderId, search, tags, limit, offset, sortBy, sortOrder, organizationId } = validatedParams.data;

    let whereConditions = [];

    if (organizationId) {
      const hasAccess = await canUserAccessOrganizationFiles(session.user.id, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to organization files' }, { status: 403 });
      }
      whereConditions.push(eq(fileLibrary.organizationId, organizationId));
    } else {
      whereConditions.push(eq(fileLibrary.userId, session.user.id));
      whereConditions.push(isNull(fileLibrary.organizationId));
    }

    if (folderId) {
      whereConditions.push(eq(fileLibrary.folderId, folderId));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(fileLibrary.filename, `%${search}%`),
          ilike(fileLibrary.originalName, `%${search}%`),
          ilike(fileLibrary.description, `%${search}%`),
        )!,
      );
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim());
      whereConditions.push(sql`${fileLibrary.tags} @> ${JSON.stringify(tagArray)}::jsonb`);
    }

    const orderByColumn =
      sortBy === 'filename' ? fileLibrary.filename : sortBy === 'size' ? fileLibrary.size : fileLibrary.createdAt;

    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const files = await db
      .select({
        id: fileLibrary.id,
        filename: fileLibrary.filename,
        originalName: fileLibrary.originalName,
        contentType: fileLibrary.contentType,
        size: fileLibrary.size,
        url: fileLibrary.url,
        thumbnailUrl: fileLibrary.thumbnailUrl,
        folderId: fileLibrary.folderId,
        tags: fileLibrary.tags,
        description: fileLibrary.description,
        isPublic: fileLibrary.isPublic,
        publicId: fileLibrary.publicId,
        createdAt: fileLibrary.createdAt,
        updatedAt: fileLibrary.updatedAt,
        folderName: fileFolder.name,
      })
      .from(fileLibrary)
      .leftJoin(fileFolder, eq(fileLibrary.folderId, fileFolder.id))
      .where(and(...whereConditions))
      .orderBy(orderDirection(orderByColumn))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(fileLibrary)
      .where(and(...whereConditions));

    return NextResponse.json({
      files,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    const description = formData.get('description') as string | null;
    const tagsStr = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const tags = tagsStr
      ? tagsStr
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    const validatedData = FileUploadSchema.safeParse({
      file,
      folderId: folderId || undefined,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    if (!validatedData.success) {
      const errorMessage = validatedData.error.errors.map((error) => error.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const organizationId = formData.get('organizationId') as string | null;

    if (organizationId) {
      const canModify = await canUserModifyOrganizationFiles(session.user.id, organizationId);
      if (!canModify) {
        return NextResponse.json({ error: 'Access denied to modify organization files' }, { status: 403 });
      }
    }

    if (folderId) {
      const folderConditions = organizationId
        ? [eq(fileFolder.id, folderId), eq(fileFolder.organizationId, organizationId)]
        : [eq(fileFolder.id, folderId), eq(fileFolder.userId, session.user.id)];

      const folder = await db
        .select()
        .from(fileFolder)
        .where(and(...folderConditions))
        .limit(1);

      if (!folder.length) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    const fileId = generateId();

    const blob = await put(`files/${session.user.id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    const fileRecord = {
      id: fileId,
      userId: session.user.id,
      organizationId: organizationId || null,
      filename: file.name,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      url: blob.url,
      thumbnailUrl: null,
      folderId: folderId || null,
      tags: tags.length > 0 ? tags : null,
      description: description || null,
      metadata: null,
      isPublic: false,
      publicId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(fileLibrary).values(fileRecord);

    return NextResponse.json({
      id: fileRecord.id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      contentType: fileRecord.contentType,
      size: fileRecord.size,
      url: fileRecord.url,
      thumbnailUrl: fileRecord.thumbnailUrl,
      folderId: fileRecord.folderId,
      tags: fileRecord.tags,
      description: fileRecord.description,
      isPublic: fileRecord.isPublic,
      createdAt: fileRecord.createdAt,
      updatedAt: fileRecord.updatedAt,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
