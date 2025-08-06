'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUpDownIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { formatBytes } from '@/lib/utils';
import { FileIcon } from './file-icon';
import { FileActionsCell } from './file-actions-cell';
import { EditableFilename } from './editable-filename';

export interface FileData {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string | null;
  folderName?: string | null;
  tags?: string[] | null;
  description?: string | null;
}

interface ColumnContext {
  editingFileId: string | null;
  setEditingFileId: (id: string | null) => void;
}

export const createColumns = (context: ColumnContext): ColumnDef<FileData>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    id: 'filename',
    accessorKey: 'filename',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      const sortIndex = column.getSortIndex();
      const handleClick = (e: React.MouseEvent) => {
        column.toggleSorting(
          column.getIsSorted() === 'asc',
          e.shiftKey
        );
      };
      
      const getSortIcon = () => {
        if (sorted === 'asc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        } else if (sorted === 'desc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        }
        return <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />;
      };
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="h-8 px-1 lg:px-2 text-xs"
              >
                Name
                {getSortIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to sort by name</p>
              <p className="text-xs text-muted-foreground">Hold Shift + Click to add to multi-sort</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    cell: ({ row }) => {
      const file = row.original;
      const isEditing = context.editingFileId === file.id;
      return (
        <div className="flex items-center space-x-2">
          <FileIcon contentType={file.contentType || 'application/octet-stream'} />
          <div className="min-w-0 flex-1">
            <EditableFilename
              file={file}
              isEditing={isEditing}
              onEditingChange={(editing) => {
                context.setEditingFileId(editing ? file.id : null);
              }}
            />
            {file.description && <p className="text-xs text-muted-foreground truncate">{file.description}</p>}
          </div>
        </div>
      );
    },
    minSize: 200,
  },
  {
    id: 'type',
    accessorKey: 'contentType',
    header: 'Type',
    cell: ({ row }) => {
      const contentType = row.getValue('type') as string;
      const type = contentType ? contentType.split('/')[0] : 'unknown';
      const extension =
        row.original.originalName?.split('.').pop()?.toUpperCase() ||
        row.original.filename?.split('.').pop()?.toUpperCase();

      return (
        <div className="text-xs">
          <div className="font-medium capitalize">{type}</div>
          {extension && <div className="text-[10px] text-muted-foreground">{extension}</div>}
        </div>
      );
    },
    size: 80,
  },
  {
    id: 'size',
    accessorKey: 'size',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      const sortIndex = column.getSortIndex();
      const handleClick = (e: React.MouseEvent) => {
        column.toggleSorting(
          column.getIsSorted() === 'asc',
          e.shiftKey
        );
      };
      
      const getSortIcon = () => {
        if (sorted === 'asc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        } else if (sorted === 'desc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        }
        return <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />;
      };
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="h-8 px-1 lg:px-2 text-xs"
              >
                Size
                {getSortIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to sort by size</p>
              <p className="text-xs text-muted-foreground">Hold Shift + Click to add to multi-sort</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    cell: ({ row }) => {
      const size = row.getValue('size') as number;
      return <div className="text-xs">{formatBytes(size)}</div>;
    },
    size: 100,
  },
  {
    id: 'uploaded',
    accessorKey: 'createdAt',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      const sortIndex = column.getSortIndex();
      const handleClick = (e: React.MouseEvent) => {
        column.toggleSorting(
          column.getIsSorted() === 'asc',
          e.shiftKey
        );
      };
      
      const getSortIcon = () => {
        if (sorted === 'asc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        } else if (sorted === 'desc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        }
        return <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />;
      };
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="h-8 px-1 lg:px-2 text-xs"
              >
                Uploaded
                {getSortIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to sort by upload date</p>
              <p className="text-xs text-muted-foreground">Hold Shift + Click to add to multi-sort</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    cell: ({ row }) => {
      const dateValue = row.getValue('uploaded') as string;
      if (!dateValue) {
        return <div className="text-sm text-muted-foreground">-</div>;
      }

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return <div className="text-sm text-muted-foreground">Invalid date</div>;
      }

      return (
        <div className="text-xs">
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      );
    },
    size: 120,
  },
  {
    id: 'modified',
    accessorKey: 'updatedAt',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      const sortIndex = column.getSortIndex();
      const handleClick = (e: React.MouseEvent) => {
        column.toggleSorting(
          column.getIsSorted() === 'asc',
          e.shiftKey
        );
      };
      
      const getSortIcon = () => {
        if (sorted === 'asc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        } else if (sorted === 'desc') {
          return (
            <span className="ml-2 flex items-center">
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              {sortIndex > -1 && <span className="ml-0.5 text-xs">{sortIndex + 1}</span>}
            </span>
          );
        }
        return <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />;
      };
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="h-8 px-1 lg:px-2 text-xs"
              >
                Modified
                {getSortIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to sort by modification date</p>
              <p className="text-xs text-muted-foreground">Hold Shift + Click to add to multi-sort</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    cell: ({ row }) => {
      const dateValue = row.getValue('modified') as string;
      if (!dateValue) {
        return <div className="text-sm text-muted-foreground">-</div>;
      }

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return <div className="text-sm text-muted-foreground">Invalid date</div>;
      }

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        if (diffInMinutes < 60) {
          return <div className="text-xs">{diffInMinutes}m ago</div>;
        }
        return <div className="text-xs">{Math.floor(diffInHours)}h ago</div>;
      }

      return (
        <div className="text-xs">
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </div>
      );
    },
    size: 100,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <FileActionsCell
        file={row.original}
        onRename={() => context.setEditingFileId(row.original.id)}
      />
    ),
    size: 50,
  },
];
