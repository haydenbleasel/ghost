import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { notFound } from 'next/navigation';
import { ServerDetail } from './_components/detail';

const ServerPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await requireUser();
  const { id } = await params;

  const server = await prisma.server.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    include: { agent: { select: { lastHeartbeatAt: true } } },
  });

  if (!server) notFound();

  return (
    <ServerDetail
      server={{
        id: server.id,
        name: server.name,
        game: server.game,
        ipv4: server.ipv4,
        phase: server.phase,
        observedState: server.observedState,
        desiredState: server.desiredState,
        lastHeartbeatAt:
          server.agent?.lastHeartbeatAt?.toISOString() ?? null,
      }}
    />
  );
};

export default ServerPage;
