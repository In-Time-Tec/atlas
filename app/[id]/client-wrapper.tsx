'use client';

import { Suspense, useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ChatInterface } from '@/components/chat-interface';
import { PageHeader } from '@/components/page-header';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { useUserData } from '@/hooks/use-user-data';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface ClientWrapperProps {
  initialChatId: string;
  initialMessages: any[];
  initialVisibility: 'public' | 'private';
  isOwner: boolean;
}

export default function ClientWrapper({
  initialChatId,
  initialMessages,
  initialVisibility,
  isOwner,
}: ClientWrapperProps) {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const { user, subscriptionData, isProUser, isLoading: isProStatusLoading } = useUserData();
  const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
    'atlas-custom-instructions-enabled',
    true,
  );
  
  return (
    <Suspense>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <PageHeader
            title=""
            rightContent={
              <ChatHistoryButton onClickAction={() => setCommandDialogOpen(true)} />
            }
            user={user}
            subscriptionData={subscriptionData}
            isProUser={isProUser}
            isProStatusLoading={isProStatusLoading}
            isCustomInstructionsEnabled={isCustomInstructionsEnabled}
            setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
          />
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              initialChatId={initialChatId}
              initialMessages={initialMessages}
              initialVisibility={initialVisibility}
              isOwner={isOwner}
              onHistoryClick={() => setCommandDialogOpen(true)}
              commandDialogOpen={commandDialogOpen}
              setCommandDialogOpen={setCommandDialogOpen}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
}