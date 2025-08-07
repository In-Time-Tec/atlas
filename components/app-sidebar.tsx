'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Crown, Binoculars, ChatCircle, Plus, Gear } from '@phosphor-icons/react';
import { useUserData } from '@/hooks/use-user-data';
import { useSession } from '@/lib/auth-client';
import { useCurrentOrganization } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, isLoading } = useUserData();
  const { data: session, isPending: sessionPending } = useSession();
  const { organization: currentOrg } = useCurrentOrganization();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = !!(user || session);
  const authCheckComplete = mounted && !isLoading && !sessionPending;
  const showAuthRoutes = authCheckComplete && isAuthenticated;

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-black">
                  <Image src="/atlas.png" alt="Atlas logo" width={32} height={32} className="size-full object-cover" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Atlas</span>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-accent/80 transition-all hover:scale-105"
                    >
                      <Plus size={20} className="transition-all hover:rotate-90" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent>
        {showAuthRoutes && (
          <SidebarGroup>
            <SidebarGroupLabel asChild className="text-dark px-2.5">
              <OrganizationSwitcher />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-3">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/files'}>
                    <Link href="/files" className="flex items-center gap-3">
                      <FolderOpen size={16} />
                      <span className="text-xs">Files</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === '/' ||
                      /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname)
                    }
                  >
                    <Link href="/" className="flex items-center gap-3">
                      <ChatCircle size={16} />
                      <span className="text-xs">Chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {showAuthRoutes && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/tasks'}>
                        <Link href="/tasks" className="flex items-center gap-3">
                          <Binoculars size={16} />
                          <span className="text-xs">Tasks</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
                {currentOrg && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === '/organization/settings'}>
                      <Link href="/organization/settings" className="flex items-center gap-3">
                        <Gear size={16} />
                        <span className="text-xs">Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {!currentOrg && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === '/organization/settings'}>
                      <Link href="/organization/settings" className="flex items-center gap-3">
                        <Gear size={16} />
                        <span className="text-xs">Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
