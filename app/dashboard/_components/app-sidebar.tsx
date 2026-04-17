'use client';

import {
  Add01Icon,
  CloudServerIcon,
  DashboardSquare01Icon,
  Logout03Icon,
  UnfoldMoreIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export type SidebarServer = {
  id: string;
  name: string;
  game: string;
  observedState: string;
};

export type SidebarUser = {
  name: string | null;
  email: string;
};

const statusDotClass = (state: string) => {
  if (state === 'running') return 'bg-emerald-500';
  if (state === 'failed' || state === 'lost') return 'bg-destructive';
  if (state === 'unhealthy') return 'bg-amber-500';
  return 'bg-muted-foreground/40';
};

export const AppSidebar = ({
  servers,
  user,
}: {
  servers: SidebarServer[];
  user: SidebarUser;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const initial = (user.name ?? user.email ?? '?').charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Ultrabeam">
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Logo />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold text-sm">
                    Ultrabeam
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    Game servers
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/dashboard'}
                  tooltip="Dashboard"
                >
                  <Link href="/dashboard">
                    <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/dashboard/new'}
                  tooltip="New server"
                >
                  <Link href="/dashboard/new">
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    <span>New server</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Servers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {servers.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
                    No servers yet.
                  </div>
                </SidebarMenuItem>
              ) : (
                servers.map((server) => {
                  const href = `/dashboard/${server.id}`;
                  return (
                    <SidebarMenuItem key={server.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === href}
                        tooltip={server.name}
                      >
                        <Link href={href}>
                          <HugeiconsIcon
                            icon={CloudServerIcon}
                            strokeWidth={2}
                          />
                          <span className="flex-1 truncate">{server.name}</span>
                          <span
                            className={cn(
                              'size-2 shrink-0 rounded-full',
                              statusDotClass(server.observedState)
                            )}
                            aria-label={server.observedState}
                          />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={user.email}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
                    {initial}
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {user.name ?? user.email}
                    </span>
                    {user.name ? (
                      <span className="truncate text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    ) : null}
                  </div>
                  <HugeiconsIcon
                    icon={UnfoldMoreIcon}
                    strokeWidth={2}
                    className="ml-auto"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="grid text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {user.name ?? user.email}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
                  Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async () => {
                    await signOut();
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
