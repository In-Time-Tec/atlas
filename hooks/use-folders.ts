'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId?: string | null;
}

interface FoldersResponse {
  folders: Folder[];
}

interface FoldersQueryParams {
  parentId?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  organizationId?: string;
}

interface CreateFolderData {
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
  organizationId?: string;
}

interface UpdateFolderData {
  id: string;
  name?: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  organizationId?: string;
}

const FOLDERS_QUERY_KEY = 'folders';

async function fetchFolders(params: FoldersQueryParams = {}): Promise<FoldersResponse> {
  const searchParams = new URLSearchParams();

  if (params.parentId) searchParams.set('parentId', params.parentId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.organizationId) searchParams.set('organizationId', params.organizationId);

  const response = await fetch(`/api/folders?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch folders');
  }

  return response.json();
}

async function createFolder(data: CreateFolderData) {
  const response = await fetch('/api/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create folder');
  }

  return response.json();
}

async function updateFolder(data: UpdateFolderData) {
  const url = data.organizationId
    ? `/api/folders/${data.id}?organizationId=${data.organizationId}`
    : `/api/folders/${data.id}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: data.name,
      parentId: data.parentId,
      color: data.color,
      icon: data.icon,
      organizationId: data.organizationId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update folder');
  }

  return response.json();
}

async function deleteFolder(id: string, organizationId?: string) {
  const url = organizationId ? `/api/folders/${id}?organizationId=${organizationId}` : `/api/folders/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete folder');
  }

  return response.json();
}

export function useFolders(params: FoldersQueryParams = {}) {
  return useQuery({
    queryKey: [FOLDERS_QUERY_KEY, params],
    queryFn: () => fetchFolders(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create folder');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
      toast.success(`Folder "${data.name}" created successfully`);
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFolder,
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update folder');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
      toast.success('Folder updated successfully');
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, organizationId }: { id: string; organizationId?: string }) => deleteFolder(id, organizationId),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete folder');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Folder deleted successfully');
    },
  });
}
