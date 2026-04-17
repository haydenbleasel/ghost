import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { AppSidebar } from './_components/app-sidebar';

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const user = await requireUser();
  const servers = await prisma.server.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, game: true, observedState: true },
  });

  return (
    <SidebarProvider>
      <AppSidebar
        servers={servers}
        user={{ name: user.name ?? null, email: user.email }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
