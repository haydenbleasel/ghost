"use client";

import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Plus,
  Server,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { games } from "@/games";
import { cn } from "@/lib/utils";

import { signOut } from "../actions/sign-out";

export interface SidebarServer {
  id: string;
  name: string;
  game: string;
  observedState: string;
  desiredState: string;
}

export interface SidebarUser {
  email: string;
}

const statusDotClass = (state: string, deleting: boolean) => {
  if (deleting) {
    return "bg-destructive";
  }
  if (state === "running") {
    return "bg-emerald-500";
  }
  if (state === "failed" || state === "lost") {
    return "bg-destructive";
  }
  if (state === "unhealthy") {
    return "bg-amber-500";
  }
  return "bg-muted-foreground/40";
};

export const AppSidebar = ({
  servers,
  user,
}: {
  servers: SidebarServer[];
  user: SidebarUser;
}) => {
  const pathname = usePathname();

  const initial = (user.email || "?").charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="offcanvas" className="border-none">
      <SidebarContent className="pt-16">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/"}
                  tooltip="Dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/new"}
                  tooltip="New server"
                >
                  <Link href="/new">
                    <Plus />
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
                  const href = `/${server.id}`;
                  const game = games.find((g) => g.id === server.game);
                  const deleting = server.desiredState === "deleted";
                  return (
                    <SidebarMenuItem key={server.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === href}
                        tooltip={server.name}
                      >
                        <Link href={href}>
                          {game ? (
                            <Image
                              src={game.image}
                              alt={game.name}
                              width={16}
                              height={16}
                              className="size-4 shrink-0 rounded-xs object-cover"
                            />
                          ) : (
                            <Server />
                          )}
                          <span className="flex-1 truncate">{server.name}</span>
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              statusDotClass(server.observedState, deleting)
                            )}
                            aria-label={
                              deleting ? "deleting" : server.observedState
                            }
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
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                    {initial}
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
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
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <User />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut();
                  }}
                >
                  <LogOut />
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
