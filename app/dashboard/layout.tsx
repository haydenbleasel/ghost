import type { ReactNode } from "react";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AppSidebar } from "./_components/app-sidebar";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
	const user = await requireUser();
	const servers = await prisma.server.findMany({
		where: { userId: user.id, deletedAt: null },
		orderBy: { createdAt: "desc" },
		select: { id: true, name: true, game: true, observedState: true },
	});

	return (
		<SidebarProvider>
			<AppSidebar
				servers={servers}
				user={{ name: user.name ?? null, email: user.email }}
			/>
			<SidebarTrigger className="absolute top-3 left-3 z-50 text-muted-foreground" />
			<SidebarInset>
				<main className="flex-1 px-6 py-20">
					<div className="mx-auto w-full max-w-5xl">{children}</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
};

export default DashboardLayout;
