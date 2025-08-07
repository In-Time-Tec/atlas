'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, File, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizationContextBadge } from '@/components/organization-context-indicator';

interface FileWithOrganization {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  organizationId?: string | null;
  organizationName?: string | null;
  createdAt: string;
  folderId?: string | null;
  folderName?: string | null;
}

interface FilesWithOrganizationContextProps {
  files: FileWithOrganization[];
  groupByOrganization?: boolean;
  showOrganizationHeaders?: boolean;
  className?: string;
}

interface OrganizationGroup {
  organizationId: string | null;
  organizationName: string | null;
  files: FileWithOrganization[];
}

export function FilesWithOrganizationContext({
  files,
  groupByOrganization = true,
  showOrganizationHeaders = true,
  className,
}: FilesWithOrganizationContextProps) {
  const groupedFiles = React.useMemo(() => {
    if (!groupByOrganization) {
      return [{ organizationId: null, organizationName: null, files }];
    }

    const groups = new Map<string, OrganizationGroup>();
    
    files.forEach((file) => {
      const key = file.organizationId || 'personal';
      if (!groups.has(key)) {
        groups.set(key, {
          organizationId: file.organizationId || null,
          organizationName: file.organizationName || null,
          files: [],
        });
      }
      groups.get(key)!.files.push(file);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (!a.organizationId && b.organizationId) return 1;
      if (a.organizationId && !b.organizationId) return -1;
      return (a.organizationName || 'Personal').localeCompare(b.organizationName || 'Personal');
    });
  }, [files, groupByOrganization]);

  if (!files.length) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <File size={32} className="mx-auto mb-2 opacity-50" />
        <p>No files found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {groupedFiles.map((group, index) => (
        <div key={group.organizationId || 'personal'} className="space-y-3">
          {showOrganizationHeaders && groupByOrganization && (
            <div className="flex items-center gap-2 pb-2 border-b">
              {group.organizationId ? (
                <Building2 size={16} className="text-primary" />
              ) : (
                <User size={16} className="text-muted-foreground" />
              )}
              <h3 className="text-sm font-medium">
                {group.organizationName || 'Personal Files'}
              </h3>
              <Badge variant="outline" className="text-xs">
                {group.files.length}
              </Badge>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {group.files.map((file) => (
              <Card
                key={file.id}
                className="relative hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <File size={16} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {file.originalName || file.filename}
                        </p>
                        {file.folderName && (
                          <div className="flex items-center gap-1 mt-1">
                            <Folder size={10} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {file.folderName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!groupByOrganization && (
                      <OrganizationContextBadge
                        organizationName={file.organizationName}
                        organizationId={file.organizationId}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {file.contentType?.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(file.size)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}