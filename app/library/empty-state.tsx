'use client';

import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, FolderIcon } from '@hugeicons/core-free-icons';

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-24 h-24 mb-6 rounded-full bg-muted/30 flex items-center justify-center">
        <HugeiconsIcon icon={FolderIcon} size={48} className="text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold mb-2">No files yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Upload your first files to get started. You can organize them with folders and tags.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onUploadClick}>
          <HugeiconsIcon icon={CloudUploadIcon} size={16} className="mr-2" />
          Upload Files
        </Button>
        <Button variant="outline">
          <HugeiconsIcon icon={FolderIcon} size={16} className="mr-2" />
          Create Folder
        </Button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Supported file types:</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-muted/30 rounded">Images</span>
          <span className="px-2 py-1 bg-muted/30 rounded">PDFs</span>
          <span className="px-2 py-1 bg-muted/30 rounded">Documents</span>
          <span className="px-2 py-1 bg-muted/30 rounded">Spreadsheets</span>
        </div>
      </div>
    </div>
  );
}
