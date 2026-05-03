import { NextResponse } from "next/server";

import { getGame, resolveSettings, validateSettings } from "@/games";
import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const game = getGame(server.game);
  if (!game) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateSettings(game.settings, body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const merged = {
    ...(server.settings as Record<string, unknown> | null),
    ...validation.data,
  };

  const updated = await prisma.server.update({
    data: { settings: merged },
    where: { id },
  });

  const agent = await prisma.agent.findUnique({ where: { serverId: id } });
  if (agent && server.observedState === "running") {
    const compose = game.buildCompose(
      { name: server.name, rconPassword: server.rconPassword },
      merged
    );
    await enqueueCommand({
      payload: { compose },
      serverId: id,
      type: "UPDATE_CONFIG",
    });
  }

  return NextResponse.json({
    settings: resolveSettings(game.settings, updated.settings),
  });
};
