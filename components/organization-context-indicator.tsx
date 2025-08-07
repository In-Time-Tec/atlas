'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganizationContextIndicatorProps {
  organizationName?: string | null;
  organizationId?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function OrganizationContextIndicator({
  organizationName,
  organizationId,
  className,
  size = 'md',
  showIcon = true,
}: OrganizationContextIndicatorProps) {
  const isPersonal = !organizationId || !organizationName;
  const displayName = isPersonal ? 'Personal' : organizationName;

  const sizeClasses = {
    sm: 'h-6 text-xs px-2',
    md: 'h-7 text-sm px-3',
    lg: 'h-8 text-sm px-4',
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <Badge
      variant={isPersonal ? 'secondary' : 'outline'}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        sizeClasses[size],
        isPersonal
          ? 'bg-secondary/50 text-secondary-foreground border-secondary/20'
          : 'bg-primary/5 text-primary border-primary/20',
        className,
      )}
    >
      {showIcon && (isPersonal ? <User size={iconSize[size]} /> : <Building2 size={iconSize[size]} />)}
      <span className="truncate">{displayName}</span>
    </Badge>
  );
}

interface OrganizationContextDisplayProps {
  organizationName?: string | null;
  organizationId?: string | null;
  className?: string;
  showLabel?: boolean;
}

export function OrganizationContextDisplay({
  organizationName,
  organizationId,
  className,
  showLabel = true,
}: OrganizationContextDisplayProps) {
  const isPersonal = !organizationId || !organizationName;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && <span className="text-sm text-muted-foreground">Context:</span>}
      <OrganizationContextIndicator organizationName={organizationName} organizationId={organizationId} size="sm" />
    </div>
  );
}

export function OrganizationContextBadge({
  organizationName,
  organizationId,
  className,
}: Pick<OrganizationContextIndicatorProps, 'organizationName' | 'organizationId' | 'className'>) {
  const isPersonal = !organizationId || !organizationName;

  if (isPersonal) return null;

  return (
    <Badge
      variant="outline"
      className={cn('text-xs bg-primary/5 text-primary border-primary/20 h-5 px-1.5', className)}
    >
      <Building2 size={10} className="mr-1" />
      {organizationName}
    </Badge>
  );
}
