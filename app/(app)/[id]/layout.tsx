import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { games } from "@/games";
import { prisma } from "@/lib/db";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { getProviderWithImage } from "@/lib/providers";
import { MissingProviderCredentialsError } from "@/lib/providers/errors";
import type { Catalog } from "@/lib/providers/types";
import { requireUser } from "@/lib/session";

import { ServerShell } from "./components/shell";

const ServerLayout = async ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) => {
  await requireUser();
  const { id } = await params;

  const server = await prisma.server.findFirst({
    include: { agent: { select: { lastHeartbeatAt: true } } },
    where: { deletedAt: null, id },
  });

  if (!server) {
    notFound();
  }

  let catalog: Catalog;
  try {
    const { provider, imageId } =
      await getProviderWithImage(SNAPSHOT_ENVIRONMENT);
    catalog = await provider.getCatalog(imageId);
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      redirect("/account");
    }
    throw error;
  }
  const serverType = catalog.serverTypes.find(
    (t) => t.name === server.serverType
  );
  const location = serverType?.locations.find(
    (l) => l.name === server.location
  );

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
          t.locations.some((l) => l.name === server.location && l.available)
      )
    : [];

  return (
    <ServerShell
      currency={catalog.currency}
      eligibleTypes={eligibleTypes}
      server={{
        backupsEnabled: server.backupsEnabled,
        desiredState: server.desiredState,
        dockerImage: game?.dockerImage ?? null,
        errorReason: server.errorReason,
        game: server.game,
        hibernationImageId: server.hibernationImageId,
        id: server.id,
        ipv4: server.ipv4,
        joinPassword: server.joinPassword,
        lastHeartbeatAt: server.agent?.lastHeartbeatAt?.toISOString() ?? null,
        location: locationInfo,
        name: server.name,
        observedState: server.observedState,
        phase: server.phase,
        serverType: server.serverType,
        settings: (server.settings ?? {}) as Record<string, unknown>,
        specs,
      }}
    >
      {children}
    </ServerShell>
  );
};

export default ServerLayout;
