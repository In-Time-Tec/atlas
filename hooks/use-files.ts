'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FilesResponse {
  files: Array<{
    id: string;
    filename: string;
    originalName: string;
    contentType: string;
    size: number;
    url: string;
    thumbnailUrl?: string | null;
    folderId?: string | null;
    folderName?: string | null;
    tags?: string[] | null;
    description?: string | null;
    isPublic: boolean;
    publicId?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface FilesQueryParams {
  folderId?: string;
  search?: string;
  tags?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'filename' | 'size';
  sortOrder?: 'asc' | 'desc';
  organizationId?: string;
}

interface UploadFileData {
  file: File;
  folderId?: string;
  description?: string;
  tags?: string[];
  organizationId?: string;
  onProgress?: (progress: number) => void;
}

interface UpdateFileData {
  id: string;
  filename?: string;
  description?: string;
  tags?: string[];
  folderId?: string | null;
  organizationId?: string;
}

const FILES_QUERY_KEY = 'files';

async function fetchFiles(params: FilesQueryParams = {}): Promise<FilesResponse> {
  const searchParams = new URLSearchParams();

  if (params.folderId) searchParams.set('folderId', params.folderId);
  if (params.search) searchParams.set('search', params.search);
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.organizationId) searchParams.set('organizationId', params.organizationId);

  const response = await fetch(`/api/files?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }

  return response.json();
}

async function uploadFile(data: UploadFileData) {
  const formData = new FormData();
  formData.append('file', data.file);

  if (data.folderId) {
    formData.append('folderId', data.folderId);
  }
  if (data.description) {
    formData.append('description', data.description);
  }
  if (data.tags && data.tags.length > 0) {
    formData.append('tags', data.tags.join(','));
  }
  if (data.organizationId) {
    formData.append('organizationId', data.organizationId);
  }

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && data.onProgress) {
        const progress = (event.loaded / event.total) * 100;
        data.onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        reject(new Error(xhr.responseText || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.open('POST', '/api/files');
    xhr.send(formData);
  });
}

async function updateFile(data: UpdateFileData) {
  const url = data.organizationId
    ? `/api/files/${data.id}?organizationId=${data.organizationId}`
    : `/api/files/${data.id}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: data.filename,
      description: data.description,
      tags: data.tags,
      folderId: data.folderId,
      organizationId: data.organizationId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update file');
  }

  return response.json();
}

async function deleteFile(id: string, organizationId?: string) {
  const url = organizationId ? `/api/files/${id}?organizationId=${organizationId}` : `/api/files/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }

  return response.json();
}

export function useFiles(params: FilesQueryParams = {}) {
  return useQuery({
    queryKey: [FILES_QUERY_KEY, params],
    queryFn: () => fetchFiles(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload file');
    },
    onSuccess: (data, variables) => {
      queryClient.setQueriesData({ queryKey: [FILES_QUERY_KEY] }, (old: FilesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          files: [data, ...old.files],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1,
          },
        };
      });
      toast.success(`${variables.file.name} uploaded successfully`);
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFile,
    onMutate: async (updateData: UpdateFileData) => {
      await queryClient.cancelQueries({ queryKey: [FILES_QUERY_KEY] });

      const previousData = queryClient.getQueriesData({ queryKey: [FILES_QUERY_KEY] });

      queryClient.setQueriesData({ queryKey: [FILES_QUERY_KEY] }, (old: FilesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          files: old.files.map((file) =>
            file.id === updateData.id
              ? {
                  ...file,
                  ...(updateData.filename !== undefined && { filename: updateData.filename }),
                  ...(updateData.description !== undefined && { description: updateData.description }),
                  ...(updateData.tags !== undefined && { tags: updateData.tags }),
                  ...(updateData.folderId !== undefined && { folderId: updateData.folderId }),
                  updatedAt: new Date().toISOString(),
                }
              : file,
          ),
        };
      });

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || 'Failed to update file');
    },
    onSuccess: (data, variables) => {
      queryClient.setQueriesData({ queryKey: [FILES_QUERY_KEY] }, (old: FilesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          files: old.files.map((file) => (file.id === variables.id ? { ...file, ...data } : file)),
        };
      });
      toast.success('File updated successfully');
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, organizationId }: { id: string; organizationId?: string }) => deleteFile(id, organizationId),
    onMutate: async ({ id: fileId }: { id: string; organizationId?: string }) => {
      await queryClient.cancelQueries({ queryKey: [FILES_QUERY_KEY] });

      const previousData = queryClient.getQueriesData({ queryKey: [FILES_QUERY_KEY] });

      queryClient.setQueriesData({ queryKey: [FILES_QUERY_KEY] }, (old: FilesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          files: old.files.filter((file) => file.id !== fileId),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1,
          },
        };
      });

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || 'Failed to delete file');
    },
    onSuccess: () => {
      toast.success('File deleted successfully');
    },
  });
}

export function useDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, organizationId }: { ids: string[]; organizationId?: string }) => {
      await Promise.all(ids.map((id) => deleteFile(id, organizationId)));
    },
    onMutate: async ({ ids: fileIds }: { ids: string[]; organizationId?: string }) => {
      await queryClient.cancelQueries({ queryKey: [FILES_QUERY_KEY] });

      const previousData = queryClient.getQueriesData({ queryKey: [FILES_QUERY_KEY] });

      queryClient.setQueriesData({ queryKey: [FILES_QUERY_KEY] }, (old: FilesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          files: old.files.filter((file) => !fileIds.includes(file.id)),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - fileIds.length,
          },
        };
      });

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || 'Failed to delete files');
    },
    onSuccess: (_, { ids }) => {
      toast.success(`${ids.length} files deleted successfully`);
    },
  });
}
