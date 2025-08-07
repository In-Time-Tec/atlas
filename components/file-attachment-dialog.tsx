'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowUpDownIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { useFiles } from '@/hooks/use-files';
import { useCurrentOrganization } from '@/hooks/use-organization';
import { formatBytes } from '@/lib/utils';
import { FileIcon } from '@/app/files/file-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface FileAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelect: (files: FileData[]) => void;
  selectedFiles?: FileData[];
}

export function FileAttachmentDialog({
  open,
  onOpenChange,
  onFilesSelect,
  selectedFiles = [],
}: FileAttachmentDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) {
      setRowSelection({});
    }
  }, [open]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { organization } = useCurrentOrganization();
  const contextName = organization ? organization.name : 'Personal';
  const contextDescription = organization
    ? `Showing files from ${organization.name}`
    : 'Showing files from your personal library';

  const { data, isLoading } = useFiles({
    limit: 1000,
    offset: 0,
    organizationId: organization?.id,
  });

  const files = useMemo(() => {
    const allFiles = data?.files || [];
    if (!searchQuery) return allFiles;

    const searchTerm = searchQuery.toLowerCase();
    return allFiles.filter((file) => {
      const searchableText = [file.filename, file.originalName, file.contentType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }, [data?.files, searchQuery]);

  const columns = useMemo<ColumnDef<FileData>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => {
          const allRows = table.getRowModel().rows;
          const selectableRows = allRows.filter((row) => !selectedFiles.some((f) => f.id === row.original.id));
          const allSelectableSelected = selectableRows.length > 0 && selectableRows.every((row) => row.getIsSelected());
          const someSelectableSelected = selectableRows.some((row) => row.getIsSelected());

          return (
            <Checkbox
              checked={allSelectableSelected || (someSelectableSelected && 'indeterminate')}
              onCheckedChange={(value) => {
                allRows.forEach((row) => {
                  const isAlreadyAttached = selectedFiles.some((f) => f.id === row.original.id);
                  if (!isAlreadyAttached) {
                    row.toggleSelected(!!value);
                  }
                });
              }}
              aria-label="Select all"
              disabled={selectableRows.length === 0}
            />
          );
        },
        cell: ({ row }) => {
          const isAlreadyAttached = selectedFiles.some((f) => f.id === row.original.id);
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              disabled={isAlreadyAttached}
              aria-label="Select row"
            />
          );
        },
        enableSorting: false,
        size: 40,
      },
      {
        id: 'filename',
        accessorKey: 'filename',
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          const sortIndex = column.getSortIndex();
          const handleClick = (e: React.MouseEvent) => {
            column.toggleSorting(column.getIsSorted() === 'asc', e.shiftKey);
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
                  <Button variant="ghost" size="sm" onClick={handleClick} className="h-8 px-1 lg:px-2 text-xs">
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
          const isAlreadyAttached = selectedFiles.some((f) => f.id === file.id);
          return (
            <div className="flex items-center space-x-2">
              <FileIcon contentType={file.contentType || 'application/octet-stream'} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{file.filename}</p>
                  {isAlreadyAttached && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Attached</span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        accessorKey: 'contentType',
        header: 'Type',
        cell: ({ row }) => {
          const contentType = row.getValue('type') as string;
          const type = contentType ? contentType.split('/')[0] : 'unknown';
          return (
            <div className="text-sm">
              <div className="font-medium capitalize">{type}</div>
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
            column.toggleSorting(column.getIsSorted() === 'asc', e.shiftKey);
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
                  <Button variant="ghost" size="sm" onClick={handleClick} className="h-8 px-1 lg:px-2 text-xs">
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
          return <div className="text-sm">{formatBytes(size)}</div>;
        },
        size: 100,
      },
    ],
    [selectedFiles],
  );

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    getRowId: (row) => String(row.id),
    autoResetPageIndex: false,
    enableMultiSort: true,
    maxMultiSortColCount: 5,
  });

  const handleAttach = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedFileData = selectedRows.map((row) => row.original);
    onFilesSelect(selectedFileData);
    onOpenChange(false);
  };

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[50vw] max-w-[50vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attach Files</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Library:</span>
              <span className="text-xs font-medium">{contextName}</span>
            </div>
            <span className="text-xs text-muted-foreground">{contextDescription}</span>
          </div>

          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 focus-visible:ring-0"
            />
          </div>

          <div className="flex-1 rounded-md border overflow-hidden">
            <div className="relative h-[380px] overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      {headerGroup.headers.map((header) => {
                        return (
                          <th
                            key={header.id}
                            style={{ width: header.getSize() }}
                            className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-sm [&:has([role=checkbox])]:pr-0 bg-background"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {isLoading ? (
                    <tr>
                      <td colSpan={columns.length} className="h-24 text-center text-sm">
                        Loading files...
                      </td>
                    </tr>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-2.5 px-3 align-middle text-sm [&:has([role=checkbox])]:pr-0">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="h-24 text-center text-sm">
                        No files found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedCount > 0 && <span>{selectedCount} file(s) selected</span>}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <select
                  className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm"
                  value={pagination.pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPagination((prev) => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
                  }}
                >
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {pagination.pageIndex + 1} of {table.getPageCount()}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedFiles.length > 0 && `${selectedFiles.length} file(s) already attached`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAttach} disabled={selectedCount === 0}>
                Attach {selectedCount > 0 && `(${selectedCount})`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
