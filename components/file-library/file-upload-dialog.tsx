'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CloudUploadIcon,
  Delete02Icon,
  FileIcon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';

import { useUploadFile } from '@/hooks/use-files';
import { useCurrentOrganization } from '@/hooks/use-organization';
import { formatBytes } from '@/lib/utils';

interface FileUploadDialogProps {
  onClose: () => void;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUploadDialog({ onClose }: FileUploadDialogProps) {
  const [files, setFiles] = React.useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [tags, setTags] = React.useState('');

  const { organization } = useCurrentOrganization();
  const uploadFile = useUploadFile();

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        return false;
      }
      return true;
    });

    const filesWithProgress: FileWithProgress[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...filesWithProgress]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileWithProgress = pendingFiles[i];
      const fileIndex = files.findIndex((f) => f.file === fileWithProgress.file);

      setFiles((prev) => prev.map((f, idx) => (idx === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f)));

      try {
        await uploadFile.mutateAsync({
          file: fileWithProgress.file,
          description: description || undefined,
          tags: tags
            ? tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          organizationId: organization?.id,
          onProgress: (progress) => {
            setFiles((prev) => prev.map((f, idx) => (idx === fileIndex ? { ...f, progress } : f)));
          },
        });

        setFiles((prev) => prev.map((f, idx) => (idx === fileIndex ? { ...f, status: 'success', progress: 100 } : f)));
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f,
          ),
        );
      }
    }

    const allSuccess = files.every((f) => f.status === 'success');
    if (allSuccess) {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const hasFiles = files.length > 0;
  const hasUploadableFiles = files.some((f) => f.status === 'pending' || f.status === 'error');
  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto w-12 h-12 mb-4">
          <HugeiconsIcon icon={CloudUploadIcon} size={48} className="text-muted-foreground" />
        </div>
        <div className="mb-4">
          <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground">Support for images, documents, and more. Max 10MB per file.</p>
        </div>
        <Input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx"
        />
        <Label htmlFor="file-upload" className="cursor-pointer">
          <Button type="button" variant="outline">
            Choose Files
          </Button>
        </Label>
      </div>

      {hasFiles && (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for these files..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="Add tags separated by commas..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Files to upload</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((fileWithProgress, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-shrink-0">
                    {fileWithProgress.status === 'success' ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} className="text-green-500" />
                    ) : fileWithProgress.status === 'error' ? (
                      <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-destructive" />
                    ) : (
                      <HugeiconsIcon icon={FileIcon} size={20} className="text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileWithProgress.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(fileWithProgress.file.size)}</p>

                    {fileWithProgress.status === 'uploading' && (
                      <Progress value={fileWithProgress.progress} className="mt-2 h-1" />
                    )}

                    {fileWithProgress.status === 'error' && (
                      <p className="text-xs text-destructive mt-1">{fileWithProgress.error}</p>
                    )}
                  </div>

                  {fileWithProgress.status !== 'uploading' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        {hasFiles && (
          <Button onClick={uploadAllFiles} disabled={!hasUploadableFiles || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        )}
      </div>
    </div>
  );
}
