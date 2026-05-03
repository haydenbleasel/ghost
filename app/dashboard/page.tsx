import { ArrowRightIcon, PlusIcon, ServerIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { games } from "@/games";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

import { PageBody, PageHeader } from "./_components/page-header";

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

const DashboardPage = async () => {
  const user = await requireUser();
  const servers = await prisma.server.findMany({
    orderBy: { createdAt: "desc" },
    where: { deletedAt: null, userId: user.id },
  });

  const newServerAction = (
    <Button asChild size="sm">
      <Link href="/dashboard/new">
        <PlusIcon />
        New server
      </Link>
    </Button>
  );

  if (servers.length === 0) {
    return (
      <>
        <PageHeader actions={newServerAction} title="Servers" />
        <PageBody>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ServerIcon />
              </EmptyMedia>
              <EmptyTitle>No servers yet</EmptyTitle>
              <EmptyDescription>
                Spin up your first game server in under a minute.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/dashboard/new">Create server</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader actions={newServerAction} title="Servers" />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2">
          {servers.map((server) => {
            const game = games.find((g) => g.id === server.game);
            const deleting = server.desiredState === "deleted";
            const statusLabel = deleting ? "deleting" : server.observedState;
            const phaseLabel = deleting ? "deleting" : server.phase;

            return (
              <Link
                key={server.id}
                href={`/dashboard/${server.id}`}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                    {game ? (
                      <Image
                        src={game.image}
                        alt={game.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        placeholder="blur"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-muted">
                        <ServerIcon className="size-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {server.name}
                      </span>
                      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="truncate text-muted-foreground text-xs">
                      {game?.name ?? server.game} ·{" "}
                      {server.location.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted/60 px-2 py-1">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        statusDotClass(server.observedState, deleting)
                      )}
                      aria-hidden
                    />
                    <span className="text-xs capitalize">{statusLabel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-foreground/10 border-t pt-3 text-xs">
                  <span className="font-mono text-muted-foreground">
                    {server.ipv4 ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground/70">
                      {server.serverType}
                    </span>{" "}
                    · {phaseLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </PageBody>
    </>
  );
};

export default DashboardPage;
