import type { ReactNode } from "react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

import { AppContainer } from "./_components/app-container";
import { AppSidebar } from "./_components/app-sidebar";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const user = await requireUser();
  const servers = await prisma.server.findMany({
    orderBy: { createdAt: "desc" },
    select: { game: true, id: true, name: true, observedState: true },
    where: { deletedAt: null, userId: user.id },
  });

  return (
    <SidebarProvider className="bg-sidebar">
      <AppSidebar
        servers={servers}
        user={{
          email: user.email,
          hasImage: Boolean(user.image),
          name: user.name ?? null,
        }}
      />
      <SidebarTrigger className="fixed top-3 left-3 z-50 text-muted-foreground" />
      <AppContainer>
        <div className="flex-1 px-6 py-20">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </div>
      </AppContainer>
    </SidebarProvider>
  );
};

export default DashboardLayout;
