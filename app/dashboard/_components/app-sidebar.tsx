"use client";

import {
	ChevronsUpDown,
	LayoutDashboard,
	LogOut,
	Plus,
	Server,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
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
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
	if (state === "running") return "bg-emerald-500";
	if (state === "failed" || state === "lost") return "bg-destructive";
	if (state === "unhealthy") return "bg-amber-500";
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
	const router = useRouter();

	const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

	return (
		<Sidebar collapsible="icon">
			<SidebarContent className="pt-16">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={pathname === "/dashboard"}
									tooltip="Dashboard"
								>
									<Link href="/dashboard">
										<LayoutDashboard />
										<span>Dashboard</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={pathname === "/dashboard/new"}
									tooltip="New server"
								>
									<Link href="/dashboard/new">
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
									const href = `/dashboard/${server.id}`;
									return (
										<SidebarMenuItem key={server.id}>
											<SidebarMenuButton
												asChild
												isActive={pathname === href}
												tooltip={server.name}
											>
												<Link href={href}>
													<Server />
													<span className="flex-1 truncate">{server.name}</span>
													<span
														className={cn(
															"size-2 shrink-0 rounded-full",
															statusDotClass(server.observedState),
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
											{user.name ?? user.email}
										</span>
										<span className="truncate text-muted-foreground text-xs">
											{user.email}
										</span>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>
									<User />
									Account
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={async () => {
										await signOut();
										router.push("/");
										router.refresh();
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
