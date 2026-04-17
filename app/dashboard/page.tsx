import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import Link from 'next/link';

const DashboardPage = async () => {
  const user = await requireUser();
  const servers = await prisma.server.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (servers.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">No servers yet</h1>
        <p className="text-muted-foreground">
          Spin up your first Minecraft server in under a minute.
        </p>
        <Button asChild>
          <Link href="/dashboard/new">Create server</Link>
        </Button>
      </div>
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
            <Badge variant={statusVariant(server.observedState)}>
              {server.observedState}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">
                {server.ipv4 ?? '—'}
              </span>
              <span className="text-muted-foreground">Phase: {server.phase}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

function statusVariant(
  state: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (state === 'running') return 'default';
  if (state === 'failed' || state === 'lost') return 'destructive';
  if (state === 'unhealthy') return 'secondary';
  return 'outline';
}

export default DashboardPage;
