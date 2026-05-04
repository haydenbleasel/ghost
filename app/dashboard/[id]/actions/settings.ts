"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getGame, resolveSettings, validateSettings } from "@/games";
import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const inputSchema = z.object({
  serverId: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
});

export type UpdateServerSettingsInput = z.infer<typeof inputSchema>;

export type UpdateServerSettingsResult =
  | { ok: true; settings: Record<string, unknown> }
  | { error: string; ok: false };

export const updateServerSettings = async (
  input: UpdateServerSettingsInput
): Promise<UpdateServerSettingsResult> => {
  const user = await requireUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", ok: false };
  }

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id: parsed.data.serverId, userId: user.id },
  });
  if (!server) {
    return { error: "Not found", ok: false };
  }

  const game = getGame(server.game);
  if (!game) {
    return { error: "Unknown game", ok: false };
  }

  const validation = validateSettings(game.settings, parsed.data.values);
  if (!validation.ok) {
    return { error: validation.error, ok: false };
  }

  const merged = {
    ...(server.settings as Record<string, unknown> | null),
    ...validation.data,
  };

  const updated = await prisma.server.update({
    data: { settings: merged },
    where: { id: parsed.data.serverId },
  });

  const agent = await prisma.agent.findUnique({
    where: { serverId: parsed.data.serverId },
  });
  if (agent && server.observedState === "running") {
    const compose = game.buildCompose(
      {
        joinPassword: server.joinPassword,
        name: server.name,
        rconPassword: server.rconPassword,
      },
      merged
    );
    await enqueueCommand({
      payload: { compose },
      serverId: parsed.data.serverId,
      type: "UPDATE_CONFIG",
    });
  }

  revalidatePath("/dashboard", "layout");

  return {
    ok: true,
    settings: resolveSettings(game.settings, updated.settings) as Record<
      string,
      unknown
    >,
  };
};
