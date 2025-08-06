'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoreVerticalIcon, Download01Icon, Delete02Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { useDeleteFile, useUpdateFile } from '@/hooks/use-files';
import type { FileData } from './columns';
import { downloadFile } from '@/lib/utils/download';

interface FileActionsCellProps {
  file: FileData;
  onRename: () => void;
}

export function FileActionsCell({ file, onRename }: FileActionsCellProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const deleteMutation = useDeleteFile();
  const updateMutation = useUpdateFile();
  
  const isDeleting = deleteMutation.isPending;

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      setIsDeleteDialogOpen(false);
    }
  }, [deleteMutation.isSuccess]);

  const handleDownload = async () => {
    try {
      await downloadFile(file.url, file.originalName);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(file.id);
  };

  const handleRename = () => {
    onRename();
  };

  const isLoading = updateMutation.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
            <span className="sr-only">Open menu</span>
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload} disabled={isLoading}>
            <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRename} disabled={isLoading}>
            <HugeiconsIcon icon={Edit02Icon} size={16} className="mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
            <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-1/3">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &apos;{file.originalName}&apos;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
