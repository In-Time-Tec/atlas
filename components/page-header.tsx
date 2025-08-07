'use client';

import * as React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/components/user-profile';
import { OrganizationContextDisplay } from '@/components/organization-context-indicator';
import { useCurrentOrganization } from '@/hooks/use-organization';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showSidebarTrigger?: boolean;
  showOrganizationContext?: boolean;
  user?: any;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
  className?: string;
}

export function PageHeader({
  title,
  leftContent,
  rightContent,
  showSidebarTrigger = true,
  showOrganizationContext = true,
  user,
  subscriptionData,
  isProUser,
  isProStatusLoading,
  isCustomInstructionsEnabled = true,
  setIsCustomInstructionsEnabled = () => {},
  className,
}: PageHeaderProps) {
  const { organization } = useCurrentOrganization();
  return (
    <header className={cn('flex h-16 shrink-0 items-center justify-between px-6 border-b border-border/50', className)}>
      <div className="flex items-center gap-1">
        {showSidebarTrigger && (
          <>
            <SidebarTrigger className="-ml-2" />
            {title && <Separator orientation="vertical" className="h-4" />}
          </>
        )}
        {title && <h1 className="text-md font-semibold">{title}</h1>}
        {leftContent && (
          <>
            <Separator orientation="vertical" className="h-4" />
            {leftContent}
          </>
        )}
        {showOrganizationContext && (title || leftContent) && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <OrganizationContextDisplay
              organizationName={organization?.name}
              organizationId={organization?.id}
              showLabel={false}
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {rightContent}
        <UserProfile
          user={user}
          subscriptionData={subscriptionData}
          isProUser={isProUser}
          isProStatusLoading={isProStatusLoading}
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
        />
      </div>
    </header>
  );
}
