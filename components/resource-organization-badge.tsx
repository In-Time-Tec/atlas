'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceOrganizationBadgeProps {
  organizationId?: string | null;
  organizationName?: string | null;
  className?: string;
  size?: 'xs' | 'sm';
  hidePersonal?: boolean;
}

export function ResourceOrganizationBadge({
  organizationId,
  organizationName,
  className,
  size = 'xs',
  hidePersonal = false,
}: ResourceOrganizationBadgeProps) {
  const isPersonal = !organizationId || !organizationName;

  if (isPersonal && hidePersonal) {
    return null;
  }

  const displayName = isPersonal ? 'Personal' : organizationName;

  const sizeClasses = {
    xs: 'h-4 text-[10px] px-1.5',
    sm: 'h-5 text-xs px-2',
  };

  const iconSize = {
    xs: 8,
    sm: 10,
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 font-medium border',
        sizeClasses[size],
        isPersonal
          ? 'bg-secondary/30 text-secondary-foreground border-secondary/40'
          : 'bg-primary/10 text-primary border-primary/30',
        className,
      )}
    >
      {isPersonal ? <User size={iconSize[size]} /> : <Building2 size={iconSize[size]} />}
      <span className="truncate">{displayName}</span>
    </Badge>
  );
}

interface ResourceItemWithOrgProps {
  children: React.ReactNode;
  organizationId?: string | null;
  organizationName?: string | null;
  showOrgBadge?: boolean;
  className?: string;
}

export function ResourceItemWithOrg({
  children,
  organizationId,
  organizationName,
  showOrgBadge = true,
  className,
}: ResourceItemWithOrgProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {showOrgBadge && (
        <div className="absolute top-2 right-2">
          <ResourceOrganizationBadge
            organizationId={organizationId}
            organizationName={organizationName}
            hidePersonal={true}
          />
        </div>
      )}
    </div>
  );
}
