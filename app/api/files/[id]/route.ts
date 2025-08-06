import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileLibrary, fileFolder } from '@/lib/db/schema';
import { canUserAccessOrganizationFiles, canUserModifyOrganizationFiles } from '@/lib/organization-utils';

const FileUpdateSchema = z.object({
  filename: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const fileId = params.id;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (organizationId) {
      const hasAccess = await canUserAccessOrganizationFiles(session.user.id, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to organization files' }, { status: 403 });
      }
    }

    const whereConditions = organizationId
      ? [eq(fileLibrary.id, fileId), eq(fileLibrary.organizationId, organizationId)]
      : [eq(fileLibrary.id, fileId), eq(fileLibrary.userId, session.user.id)];

    const file = await db
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
        metadata: fileLibrary.metadata,
        isPublic: fileLibrary.isPublic,
        publicId: fileLibrary.publicId,
        createdAt: fileLibrary.createdAt,
        updatedAt: fileLibrary.updatedAt,
        folderName: fileFolder.name,
        organizationId: fileLibrary.organizationId,
      })
      .from(fileLibrary)
      .leftJoin(fileFolder, eq(fileLibrary.folderId, fileFolder.id))
      .where(and(...whereConditions))
      .limit(1);

    if (!file.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(file[0]);
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
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

    const fileId = params.id;
    const body = await request.json();
    const organizationId = body.organizationId;

    if (organizationId) {
      const canModify = await canUserModifyOrganizationFiles(session.user.id, organizationId);
      if (!canModify) {
        return NextResponse.json({ error: 'Access denied to modify organization files' }, { status: 403 });
      }
    }

    const validatedData = FileUpdateSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validatedData.error.errors }, { status: 400 });
    }

    const { filename, description, tags, folderId } = validatedData.data;

    const whereConditions = organizationId
      ? [eq(fileLibrary.id, fileId), eq(fileLibrary.organizationId, organizationId)]
      : [eq(fileLibrary.id, fileId), eq(fileLibrary.userId, session.user.id)];

    const existingFile = await db
      .select()
      .from(fileLibrary)
      .where(and(...whereConditions))
      .limit(1);

    if (!existingFile.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
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

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (filename !== undefined) updateData.filename = filename;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags.length > 0 ? tags : null;
    if (folderId !== undefined) updateData.folderId = folderId;

    console.log('Updating file with data:', updateData);

    const [updatedFile] = await db
      .update(fileLibrary)
      .set(updateData)
      .where(and(...whereConditions))
      .returning();

    if (!updatedFile) {
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }

    console.log('File updated successfully:', updatedFile);

    const fileWithFolder = await db
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
        metadata: fileLibrary.metadata,
        isPublic: fileLibrary.isPublic,
        publicId: fileLibrary.publicId,
        createdAt: fileLibrary.createdAt,
        updatedAt: fileLibrary.updatedAt,
        folderName: fileFolder.name,
        organizationId: fileLibrary.organizationId,
      })
      .from(fileLibrary)
      .leftJoin(fileFolder, eq(fileLibrary.folderId, fileFolder.id))
      .where(eq(fileLibrary.id, fileId))
      .limit(1);

    return NextResponse.json(fileWithFolder[0]);
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
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

    const fileId = params.id;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (organizationId) {
      const canModify = await canUserModifyOrganizationFiles(session.user.id, organizationId);
      if (!canModify) {
        return NextResponse.json({ error: 'Access denied to delete organization files' }, { status: 403 });
      }
    }

    const whereConditions = organizationId
      ? [eq(fileLibrary.id, fileId), eq(fileLibrary.organizationId, organizationId)]
      : [eq(fileLibrary.id, fileId), eq(fileLibrary.userId, session.user.id)];

    const existingFile = await db
      .select()
      .from(fileLibrary)
      .where(and(...whereConditions))
      .limit(1);

    if (!existingFile.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await db.delete(fileLibrary).where(and(...whereConditions));

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
