import "server-only";
import type { Server } from "@prisma/client";

import { getGame } from "@/games";
import { getProvider } from "@/lib/providers";

/**
 * Builds the docker compose file for a server from its current database
 * settings. Returns null when the server references an unknown game.
 */
export const buildServerCompose = async (
  server: Server
): Promise<string | null> => {
  const game = getGame(server.game);
  if (!game) {
    return null;
  }

  let memoryGb: number | null = null;
  if (server.providerServerId) {
    try {
      const providerServer = await getProvider().getServer(
        server.providerServerId
      );
      memoryGb = providerServer?.memoryGb ?? null;
    } catch {
      // Non-fatal: games fall back to a conservative default sizing.
    }
  }

  return game.buildCompose(
    {
      joinPassword: server.joinPassword,
      memoryGb,
      name: server.name,
      rconPassword: server.rconPassword,
    },
    server.settings
  );
};
