import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import { ServerDetail } from "./_components/detail";

const ServerPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;

  const server = await prisma.server.findFirst({
    include: { agent: { select: { lastHeartbeatAt: true } } },
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    notFound();
  }

  return (
    <ServerDetail
      server={{
        desiredState: server.desiredState,
        errorReason: server.errorReason,
        game: server.game,
        id: server.id,
        ipv4: server.ipv4,
        lastHeartbeatAt: server.agent?.lastHeartbeatAt?.toISOString() ?? null,
        name: server.name,
        observedState: server.observedState,
        phase: server.phase,
      }}
    />
  );
};

export default ServerPage;
