'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { useUserData } from '@/hooks/use-user-data';
import { LibraryContent } from './library-content';
import { LoadingSkeleton } from './loading-skeleton';

export default function LibraryPage() {
  const { user, subscriptionData, isProUser, isLoading } = useUserData();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <PageHeader title="Files" user={null} subscriptionData={null} isProUser={false} isProStatusLoading={true} />
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
              <LoadingSkeleton />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-full">
        <PageHeader
          title="Files"
          user={user}
          subscriptionData={subscriptionData}
          isProUser={isProUser}
          isProStatusLoading={isLoading}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            <LibraryContent />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
