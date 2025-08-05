'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Search01Icon, RefreshIcon, Settings02Icon } from '@hugeicons/core-free-icons';

import { useFiles, useUploadFile } from '@/hooks/use-files';
import { DataTable } from './data-table';
import { createColumns } from './columns';
import { LoadingSkeleton } from './loading-skeleton';
import type { VisibilityState } from '@tanstack/react-table';

const getColumnDisplayName = (columnId: string): string => {
  const columnNames: Record<string, string> = {
    filename: 'File Name',
    type: 'Type',
    size: 'Size',
    uploaded: 'Uploaded',
    modified: 'Modified',
  };
  return columnNames[columnId] || columnId;
};

export function LibraryContent() {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [debouncedFilter, setDebouncedFilter] = React.useState('');
  const [editingFileId, setEditingFileId] = React.useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('library-column-visibility');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading, isFetching, error, refetch } = useFiles({
    limit: 1000,
    offset: 0,
  });
  
  const uploadMutation = useUploadFile();

  const columns = React.useMemo(() => 
    createColumns({ editingFileId, setEditingFileId }), 
    [editingFileId]
  );

  const allFiles = React.useMemo(() => data?.files || [], [data?.files]);
  
  const files = React.useMemo(() => {
    if (!debouncedFilter) return allFiles;
    
    const searchTerm = debouncedFilter.toLowerCase();
    
    return allFiles.filter((file) => {
      const searchableText = [
        file.filename,
        file.originalName,
        file.contentType,
        file.description,
        file.folderName,
        ...(file.tags || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }, [allFiles, debouncedFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(globalFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [globalFilter]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('library-column-visibility', JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  const handleFileSelect = React.useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      uploadMutation.mutate({ file });
    });
  }, [uploadMutation]);

  const handleUploadClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (isLoading && !data) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Failed to load files</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          <HugeiconsIcon icon={RefreshIcon} size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex justify-between items-center gap-3">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search files..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 w-96"
          />
          {isFetching && data && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        <div className="flex gap-2 relative ">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <HugeiconsIcon icon={Settings02Icon} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {['filename', 'type', 'size', 'uploaded', 'modified']
                .map((columnId) => {
                  const isVisible = columnVisibility[columnId] !== false;
                  const columnName = getColumnDisplayName(columnId);
                  return (
                    <DropdownMenuCheckboxItem
                      key={columnId}
                      className="capitalize"
                      checked={isVisible}
                      onCheckedChange={(value) =>
                        setColumnVisibility((prev: VisibilityState) => ({
                          ...prev,
                          [columnId]: !!value,
                        }))
                      }
                    >
                      {columnName}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip open={uploadMutation.isPending ? false : undefined}>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={handleUploadClick} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Upload Files
            </TooltipContent>
          </Tooltip>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            accept="*/*"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={files}
        hideViewButton={true}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(updaterOrValue) => {
          const newVisibility = typeof updaterOrValue === 'function' 
            ? updaterOrValue(columnVisibility) 
            : updaterOrValue;
          setColumnVisibility(newVisibility);
        }}
      />
    </div>
  );
}
