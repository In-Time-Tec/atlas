'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Crown, Binoculars, House, Plus, Gear } from '@phosphor-icons/react';
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
            <div className="flex items-center justify-between px-2 py-2">
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
                      <Plus size={16} className="transition-all hover:rotate-90" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </SidebarMenuItem>
          {showAuthRoutes && (
            <SidebarMenuItem>
              <OrganizationSwitcher />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={
                pathname === '/' || /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname)
              }
            >
              <Link href="/" className="flex items-center gap-3">
                <House size={20} />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showAuthRoutes && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/tasks'}>
                  <Link href="/tasks" className="flex items-center gap-3">
                    <Binoculars size={20} />
                    <span>Tasks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/library'}>
                  <Link href="/library" className="flex items-center gap-3">
                    <FolderOpen size={20} />
                    <span>Library</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {currentOrg && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/organization/settings'}>
                    <Link href="/organization/settings" className="flex items-center gap-3">
                      <Gear size={20} />
                      <span>Organization Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
