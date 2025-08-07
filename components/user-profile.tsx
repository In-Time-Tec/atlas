'use client';

import React, { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession, signOut } from '@/lib/auth-client';
import { toast } from 'sonner';
import {
  SignOut,
  SignIn,
  UserCircle,
  Eye,
  EyeSlash,
  FileText,
  Shield,
  Sun,
  Lightning,
  Gear,
  Code,
} from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from './theme-switcher';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { User } from '@/lib/db/schema';
// Settings moved to dedicated page
import { useCurrentOrganization } from '@/hooks/use-organization';

const UserProfile = memo(
  ({
    className,
    user,
    subscriptionData,
    isProUser,
    isProStatusLoading,
    isCustomInstructionsEnabled,
    setIsCustomInstructionsEnabled,
  }: {
    className?: string;
    user?: User | null;
    subscriptionData?: any;
    isProUser?: boolean;
    isProStatusLoading?: boolean;
    isCustomInstructionsEnabled?: boolean;
    setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
  }) => {
    const [signingOut, setSigningOut] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { data: session, isPending } = useSession();
    const { organization: currentOrg } = useCurrentOrganization();
    const router = useRouter();

    const currentUser = user || session?.user;
    const isAuthenticated = !!(user || session);

    const settingsUser = user;

    const hasActiveSubscription = isProUser;

    if (isPending && !user) {
      return (
        <div className="h-8 w-8 flex items-center justify-center">
          <div className="size-4 rounded-full bg-muted/50 animate-pulse"></div>
        </div>
      );
    }

    const formatEmail = (email?: string | null) => {
      if (!email) return '';

      if (showEmail) {
        return email;
      }

      const parts = email.split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const domain = parts[1];
        const maskedUsername = username.slice(0, 3) + '•••';
        return `${maskedUsername}@${domain}`;
      }

      return email.slice(0, 3) + '•••';
    };

    return (
      <>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('p-0! m-0! focus:!outline-0 focus:!ring-0', signingOut && 'animate-pulse', className)}
                    asChild
                  >
                    <Avatar className="size-7 rounded-md border border-neutral-200 dark:border-neutral-700">
                      <AvatarImage
                        src={currentUser?.image ?? ''}
                        alt={currentUser?.name ?? ''}
                        className="rounded-md p-0 m-0 size-7"
                      />
                      <AvatarFallback className="rounded-md text-sm p-0 m-0 size-7">
                        {currentUser?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('p-0! m-0! hover:bg-transparent!', signingIn && 'animate-pulse', className)}
                  >
                    <UserCircle className="size-6" />
                  </Button>
                )}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {isAuthenticated ? 'Account' : 'Sign In'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="w-[240px] z-[110] mr-5">
            {isAuthenticated ? (
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700">
                    <AvatarImage
                      src={currentUser?.image ?? ''}
                      alt={currentUser?.name ?? ''}
                      className="rounded-md p-0 m-0 size-8"
                    />
                    <AvatarFallback className="rounded-md p-0 m-0 size-8">
                      {currentUser?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="font-medium text-sm leading-none truncate">{currentUser?.name}</p>
                    <div className="flex items-center mt-0.5 gap-1">
                      <div
                        className={`text-xs text-muted-foreground ${showEmail ? '' : 'max-w-[160px] truncate'}`}
                        title={currentUser?.email || ''}
                      >
                        {formatEmail(currentUser?.email)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmail(!showEmail);
                        }}
                        className="size-6 text-muted-foreground hover:text-foreground"
                      >
                        {showEmail ? <EyeSlash size={12} /> : <Eye size={12} />}
                        <span className="sr-only">{showEmail ? 'Hide email' : 'Show email'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700">
                    <AvatarFallback className="rounded-md">
                      <UserCircle size={18} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="font-medium text-sm leading-none">Guest</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sign in to save your progress</p>
                  </div>
                </div>
              </div>
            )}
            <DropdownMenuSeparator />

            {isAuthenticated && (
              <>
                {isProStatusLoading ? (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="size-6 rounded-md bg-muted/50 border border-border flex items-center justify-center">
                        <div className="size-3 rounded-full bg-muted animate-pulse" />
                      </div>
                      <div className="flex flex-col">
                        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                        <div className="w-20 h-2 bg-muted/50 rounded animate-pulse mt-1" />
                      </div>
                    </div>
                  </div>
                ) : subscriptionData ? (
                  hasActiveSubscription ? (
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="size-6 rounded-md bg-muted/50 border border-border flex items-center justify-center">
                          <HugeiconsIcon
                            icon={Crown02Icon}
                            size={14}
                            color="currentColor"
                            strokeWidth={1.5}
                            className="text-foreground"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-sm">Atlas Pro</span>
                          <span className="text-[10px] text-muted-foreground">Unlimited access to all features</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2.5 py-1.5"
                      onClick={() => router.push('/pricing')}
                    >
                      <div className="size-6 rounded-md bg-muted/50 border border-border flex items-center justify-center">
                        <Lightning size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Upgrade to Pro</span>
                        <span className="text-[10px] text-muted-foreground">Unlimited searches & premium models</span>
                      </div>
                    </DropdownMenuItem>
                  )
                ) : null}
                {(subscriptionData || isProStatusLoading) && <DropdownMenuSeparator />}
              </>
            )}

            {isAuthenticated && (
              <>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/settings" className="w-full flex items-center gap-2">
                    <Gear size={16} />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuItem className="cursor-pointer py-1 hover:bg-transparent!">
              <div className="flex items-center justify-between w-full px-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Sun size={16} />
                  <span className="text-sm">Theme</span>
                </div>
                <ThemeSwitcher />
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/terms" className="w-full flex items-center gap-2">
                <FileText size={16} />
                <span>Terms</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/privacy-policy" className="w-full flex items-center gap-2">
                <Shield size={16} />
                <span>Privacy</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer" asChild>
              <a
                href={'https://api.atlas.ai/'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2"
              >
                <Code size={16} />
                <span>API</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {isAuthenticated ? (
              <DropdownMenuItem
                className="cursor-pointer w-full flex items-center justify-between gap-2"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onRequest: () => {
                        setSigningOut(true);
                        toast.loading('Signing out...');
                      },
                      onSuccess: () => {
                        setSigningOut(false);
                        localStorage.clear();
                        toast.success('Signed out successfully');
                        toast.dismiss();
                        window.location.href = '/new';
                      },
                      onError: () => {
                        setSigningOut(false);
                        toast.error('Failed to sign out');
                        window.location.reload();
                      },
                    },
                  })
                }
              >
                <span>Sign Out</span>
                <SignOut className="size-4" />
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer w-full flex items-center justify-between gap-2"
                onClick={async () => {
                  console.log('[UserProfile] Sign-in button clicked');
                  console.log('[UserProfile] Current pathname:', window.location.pathname);
                  console.log('[UserProfile] Session state:', { isAuthenticated, currentUser: currentUser?.email });

                  setSigningIn(true);
                  toast.loading('Redirecting to sign-in...');

                  try {
                    const signInUrl = new URL('/sign-in', window.location.origin);
                    signInUrl.searchParams.set('from', window.location.pathname);

                    console.log('[UserProfile] Navigating to:', signInUrl.toString());

                    await router.push(signInUrl.pathname + signInUrl.search);

                    setTimeout(() => {
                      if (window.location.pathname !== '/sign-in') {
                        console.error('[UserProfile] Navigation failed, attempting direct navigation');
                        window.location.href = signInUrl.toString();
                      }
                    }, 1000);
                  } catch (error) {
                    console.error('[UserProfile] Navigation error:', error);
                    toast.error('Failed to navigate to sign-in page');

                    const fallbackUrl = new URL('/sign-in', window.location.origin);
                    fallbackUrl.searchParams.set('from', window.location.pathname);
                    window.location.href = fallbackUrl.toString();
                  } finally {
                    setTimeout(() => {
                      setSigningIn(false);
                      toast.dismiss();
                    }, 2000);
                  }
                }}
              >
                <span>Sign In</span>
                <SignIn className="size-4" />
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings dialog removed in favor of /settings page */}
      </>
    );
  },
);

UserProfile.displayName = 'UserProfile';

export { UserProfile };
