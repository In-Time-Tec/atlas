'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { useUserData } from '@/hooks/use-user-data';
import { useCurrentOrganization, useOrganizationRole } from '@/hooks/use-organization';
import { OrganizationSettingsContent } from './organization-settings-content';
import { OrganizationSettingsSkeleton } from './loading-skeleton';

export default function OrganizationSettingsPage() {
  const { user, subscriptionData, isProUser, isLoading: userLoading } = useUserData();
  const { organization, isLoading: orgLoading } = useCurrentOrganization();
  const { isOwner, isAdmin } = useOrganizationRole();
  const router = useRouter();

  const isLoading = userLoading || orgLoading;

  React.useEffect(() => {
    if (!userLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, userLoading, router]);

  React.useEffect(() => {
    if (!orgLoading && !organization) {
      router.push('/');
    }
  }, [organization, orgLoading, router]);

  React.useEffect(() => {
    if (!orgLoading && organization && !isAdmin) {
      router.push('/');
    }
  }, [organization, orgLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <PageHeader
            title="Organization Settings"
            user={null}
            subscriptionData={null}
            isProUser={false}
            isProStatusLoading={true}
          />
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
              <OrganizationSettingsSkeleton />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user || !organization || !isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-full">
        <PageHeader
          title="Organization Settings"
          user={user}
          subscriptionData={subscriptionData}
          isProUser={isProUser}
          isProStatusLoading={userLoading}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            <OrganizationSettingsContent organization={organization} isOwner={isOwner} isAdmin={isAdmin} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
