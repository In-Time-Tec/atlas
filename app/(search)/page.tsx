'use client';

import { Suspense, useState } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { InstallPrompt } from '@/components/InstallPrompt';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { useUserData } from '@/hooks/use-user-data';
import { useLocalStorage } from '@/hooks/use-local-storage';

const Home = () => {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
    'atlas-custom-instructions-enabled',
    true,
  );
  const { user, subscriptionData, isProUser, isLoading: isProStatusLoading } = useUserData();

  return (
    <Suspense>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <PageHeader
            title=""
            rightContent={<ChatHistoryButton onClickAction={() => setCommandDialogOpen(true)} />}
            user={user}
            subscriptionData={subscriptionData}
            isProUser={isProUser}
            isProStatusLoading={isProStatusLoading}
            isCustomInstructionsEnabled={isCustomInstructionsEnabled}
            setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
          />
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              onHistoryClick={() => setCommandDialogOpen(true)}
              commandDialogOpen={commandDialogOpen}
              setCommandDialogOpen={setCommandDialogOpen}
            />
          </div>
          <InstallPrompt />
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
};

export default Home;
