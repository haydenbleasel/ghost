'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ActivityStream } from './activity-stream';
import { LogsStream } from './logs-stream';

type ServerView = {
  id: string;
  name: string;
  game: string;
  ipv4: string | null;
  phase: string;
  observedState: string;
  desiredState: string;
  lastHeartbeatAt: string | null;
};

export const ServerDetail = ({ server: initial }: { server: ServerView }) => {
  const router = useRouter();
  const [server, setServer] = useState(initial);
  const [pending, setPending] = useState<null | string>(null);

  // Refresh server meta every 5s
  const ref = useRef(server);
  ref.current = server;
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/servers/${initial.id}`);
      if (!res.ok) return;
      const { server: fresh } = await res.json();
      if (fresh) {
        setServer({
          id: fresh.id,
          name: fresh.name,
          game: fresh.game,
          ipv4: fresh.ipv4,
          phase: fresh.phase,
          observedState: fresh.observedState,
          desiredState: fresh.desiredState,
          lastHeartbeatAt: fresh.agent?.lastHeartbeatAt ?? null,
        });
      }
    }, 5000);
    return () => clearInterval(t);
  }, [initial.id]);

  const sendCommand = async (type: 'START' | 'STOP' | 'RESTART') => {
    setPending(type);
    const res = await fetch(`/api/servers/${server.id}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    setPending(null);
    if (!res.ok) toast.error(`${type} failed`);
    else toast.success(`${type} queued`);
  };

  const onDelete = async () => {
    if (!confirm('Delete this server? This tears down the VM.')) return;
    setPending('DELETE');
    const res = await fetch(`/api/servers/${server.id}`, { method: 'DELETE' });
    setPending(null);
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{server.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {server.game} · {server.ipv4 ?? '—'}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={badgeVariant(server.observedState)}>
              {server.observedState}
            </Badge>
            <Badge variant="outline">{server.phase}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => sendCommand('START')}
            disabled={Boolean(pending) || server.observedState === 'running'}
          >
            Start
          </Button>
          <Button
            variant="outline"
            onClick={() => sendCommand('STOP')}
            disabled={Boolean(pending) || server.observedState !== 'running'}
          >
            Stop
          </Button>
          <Button
            variant="outline"
            onClick={() => sendCommand('RESTART')}
            disabled={Boolean(pending) || server.observedState !== 'running'}
          >
            Restart
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={Boolean(pending)}>
            Delete
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityStream serverId={server.id} />
        <LogsStream serverId={server.id} />
      </div>
    </div>
  );
};

function badgeVariant(
  state: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (state === 'running') return 'default';
  if (state === 'failed' || state === 'lost') return 'destructive';
  if (state === 'unhealthy') return 'secondary';
  return 'outline';
}
