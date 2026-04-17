import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ServerIcon } from "lucide-react";
import Link from "next/link";

const statusVariant = (state: string): "default" | "secondary" | "destructive" | "outline" => {
  if (state === "running") {
    return "default";
  }
  if (state === "failed" || state === "lost") {
    return "destructive";
  }
  if (state === "unhealthy") {
    return "secondary";
  }
  return "outline";
};

const DashboardPage = async () => {
  const user = await requireUser();
  const servers = await prisma.server.findMany({
    orderBy: { createdAt: "desc" },
    where: { deletedAt: null, userId: user.id },
  });

  if (servers.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ServerIcon />
          </EmptyMedia>
          <EmptyTitle>No servers yet</EmptyTitle>
          <EmptyDescription>
            Spin up your first Minecraft server in under a minute.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard/new">Create server</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4">
      {servers.map((server) => (
        <Card key={server.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                <Link href={`/dashboard/${server.id}`} className="hover:underline">
                  {server.name}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {server.game} · {server.location} · {server.serverType}
              </p>
            </div>
            <Badge
              variant={
                server.desiredState === "deleted"
                  ? "destructive"
                  : statusVariant(server.observedState)
              }
            >
              {server.desiredState === "deleted" ? "deleting" : server.observedState}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">{server.ipv4 ?? "—"}</span>
              <span className="text-muted-foreground">
                Phase: {server.desiredState === "deleted" ? "deleting" : server.phase}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardPage;
