import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { games } from "@/games";
import { prisma } from "@/lib/db";
import { getHetznerCatalog } from "@/lib/hetzner/catalog";
import { requireUser } from "@/lib/session";
import { ServerShell } from "./_components/shell";

const ServerLayout = async ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) => {
  const user = await requireUser();
  const { id } = await params;

  const server = await prisma.server.findFirst({
    include: { agent: { select: { lastHeartbeatAt: true } } },
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    notFound();
  }

  const catalog = await getHetznerCatalog();
  const serverType = catalog.serverTypes.find((t) => t.name === server.serverType);
  const location = serverType?.locations.find((l) => l.name === server.location);

  const specs = serverType
    ? {
        architecture: serverType.architecture,
        cores: serverType.cores,
        cpuType: serverType.cpuType,
        disk: serverType.disk,
        memory: serverType.memory,
        typeName: serverType.name,
      }
    : null;

  const locationInfo = location
    ? { city: location.city, country: location.country, name: location.name }
    : { city: null, country: null, name: server.location };

  const game = games.find((g) => g.id === server.game);
  const eligibleTypes = game
    ? catalog.serverTypes.filter(
        (t) =>
          t.memory >= game.requirements.memory &&
          t.cores >= game.requirements.cpu &&
          t.locations.some((l) => l.name === server.location && l.available),
      )
    : [];

  return (
    <ServerShell
      currency={catalog.currency}
      eligibleTypes={eligibleTypes}
      server={{
        backupsEnabled: server.backupsEnabled,
        desiredState: server.desiredState,
        errorReason: server.errorReason,
        game: server.game,
        id: server.id,
        ipv4: server.ipv4,
        lastHeartbeatAt: server.agent?.lastHeartbeatAt?.toISOString() ?? null,
        location: locationInfo,
        name: server.name,
        observedState: server.observedState,
        phase: server.phase,
        serverType: server.serverType,
        specs,
      }}
    >
      {children}
    </ServerShell>
  );
};

export default ServerLayout;
