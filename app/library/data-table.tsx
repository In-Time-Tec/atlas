'use client';

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  OnChangeFn,
  PaginationState,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons';

import { FileData } from './columns';

interface DataTableProps {
  columns: ColumnDef<FileData>[];
  data: FileData[];
  hideViewButton?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}

export function DataTable({
  columns,
  data,
  hideViewButton = false,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>(() => {
    const saved = localStorage.getItem('library-column-visibility');
    return saved ? JSON.parse(saved) : {};
  });
  const [rowSelection, setRowSelection] = React.useState({});
  
  const [pagination, setPagination] = React.useState<PaginationState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('library-pagination');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
        }
      }
    }
    return {
      pageIndex: 0,
      pageSize: 20,
    };
  });

  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const setColumnVisibility = onColumnVisibilityChange ?? setInternalColumnVisibility;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getRowId: (row) => String(row.id),
    manualPagination: false,
    autoResetPageIndex: false,
    autoResetExpanded: false,
    enableMultiSort: true,
    maxMultiSortColCount: 5,
  });

  React.useEffect(() => {
    if (!externalColumnVisibility) {
      localStorage.setItem('library-column-visibility', JSON.stringify(columnVisibility));
    }
  }, [columnVisibility, externalColumnVisibility]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('library-pagination', JSON.stringify(pagination));
    }
  }, [pagination]);

  React.useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(data.length / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPageIndex) {
      setPagination(prev => ({ ...prev, pageIndex: maxPageIndex }));
    }
  }, [data.length, pagination.pageSize, pagination.pageIndex]);

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideViewButton && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <HugeiconsIcon icon={Settings02Icon} size={16} className="mr-2" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div>
        <div className="relative h-[485px] rounded-md border overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  {headerGroup.headers.map((header) => {
                    return (
                      <th 
                        key={header.id} 
                        style={{ width: header.getSize() }} 
                        className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-xs [&:has([role=checkbox])]:pr-0 bg-background"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} data-state={row.getIsSelected() && 'selected'} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-1.5 px-3 align-middle text-xs [&:has([role=checkbox])]:pr-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-xs">
                    No files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedRowCount > 0 && (
            <span>
              {selectedRowCount} of {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm"
              value={pagination.pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPagination(prev => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
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
  );
}
