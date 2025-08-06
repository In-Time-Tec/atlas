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
  PaginationState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  MoreVerticalIcon,
  CrownIcon,
  ShieldIcon,
  UserIcon,
  Delete02Icon,
  Mail01Icon,
  Search01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowUpDownIcon,
} from '@hugeicons/core-free-icons';
import { format } from 'date-fns';

interface OrganizationMember {
  id: string;
  email: string;
  name?: string;
  role: 'member' | 'admin' | 'owner';
  joinedAt: Date;
}

interface MembersTableProps {
  members: OrganizationMember[];
  isLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  organizationId: string;
  onRemoveMember: (memberId: string) => void;
  onUpdateRole: (memberId: string, role: 'member' | 'admin' | 'owner') => void;
}

const roleIcons = {
  owner: CrownIcon,
  admin: ShieldIcon,
  member: UserIcon,
};

const roleColors = {
  owner: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  admin: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  member: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export function MembersTable({
  members,
  isLoading,
  isOwner,
  isAdmin,
  organizationId,
  onRemoveMember,
  onUpdateRole,
}: MembersTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [removeMemberId, setRemoveMemberId] = React.useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<'member' | 'admin' | 'owner'>('member');

  const columns = React.useMemo<ColumnDef<OrganizationMember>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Member
              {column.getIsSorted() === 'asc' ? (
                <HugeiconsIcon icon={ArrowUp01Icon} size={14} className="ml-2" />
              ) : column.getIsSorted() === 'desc' ? (
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="ml-2" />
              ) : (
                <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div className="flex flex-col">
              <span className="font-medium">{member.name || 'Unnamed User'}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Role
              {column.getIsSorted() === 'asc' ? (
                <HugeiconsIcon icon={ArrowUp01Icon} size={14} className="ml-2" />
              ) : column.getIsSorted() === 'desc' ? (
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="ml-2" />
              ) : (
                <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const member = row.original;
          const RoleIcon = roleIcons[member.role];
          const colorClass = roleColors[member.role];

          if (editingMemberId === member.id && isAdmin) {
            return (
              <div className="flex items-center gap-2">
                <Select value={editingRole} onValueChange={(value: any) => setEditingRole(value)}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    onUpdateRole(member.id, editingRole);
                    setEditingMemberId(null);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingMemberId(null)}>
                  Cancel
                </Button>
              </div>
            );
          }

          return (
            <Badge variant="outline" className={colorClass}>
              <HugeiconsIcon icon={RoleIcon} size={14} className="mr-1" />
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'joinedAt',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Joined
              {column.getIsSorted() === 'asc' ? (
                <HugeiconsIcon icon={ArrowUp01Icon} size={14} className="ml-2" />
              ) : column.getIsSorted() === 'desc' ? (
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="ml-2" />
              ) : (
                <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = new Date(row.original.joinedAt);
          return <span className="text-sm text-muted-foreground">{format(date, 'MMM d, yyyy')}</span>;
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const member = row.original;
          const canManageMember = isAdmin && member.role !== 'owner';
          const canRemoveMember = isOwner || (isAdmin && member.role === 'member');

          if (!canManageMember && !canRemoveMember) {
            return null;
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManageMember && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingMemberId(member.id);
                        setEditingRole(member.role);
                      }}
                    >
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canRemoveMember && (
                  <DropdownMenuItem className="text-destructive" onClick={() => setRemoveMemberId(member.id)}>
                    <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                    Remove Member
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [isOwner, isAdmin, editingMemberId, editingRole, onUpdateRole],
  );

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  const memberToRemove = members.find((m) => m.id === removeMemberId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search members..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <div className="relative overflow-auto max-h-[400px]">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} member(s)</div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
              <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name || memberToRemove?.email} from the organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeMemberId) {
                  onRemoveMember(removeMemberId);
                  setRemoveMemberId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
