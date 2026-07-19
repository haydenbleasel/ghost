"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { enqueueCommand } from "@/lib/agent/commands";
import { buildServerCompose } from "@/lib/agent/compose";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const inputSchema = z.object({
  serverId: z.string().min(1),
  type: z.enum(["START", "STOP", "RESTART"]),
});

export type RunServerCommandInput = z.infer<typeof inputSchema>;

export type RunServerCommandResult =
  | { ok: true }
  | { error: string; ok: false };

export const runServerCommand = async (
  input: RunServerCommandInput
): Promise<RunServerCommandResult> => {
  await requireUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", ok: false };
  }

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id: parsed.data.serverId },
  });
  if (!server) {
    return { error: "Not found", ok: false };
  }

  let { desiredState } = server;
  if (parsed.data.type === "STOP") {
    desiredState = "stopped";
  } else if (parsed.data.type === "START") {
    desiredState = "running";
  }

  await prisma.server.update({
    data: { desiredState },
    where: { id: parsed.data.serverId },
  });

  if (parsed.data.type === "START") {
    // Settings edited while the server was stopped only exist in the
    // database — the compose file on the VM is stale. UPDATE_CONFIG writes
    // the freshly built compose before bringing the container up, so a
    // start always applies the latest settings. Fall back to a bare START
    // if the compose can't be built (unknown game).
    const compose = await buildServerCompose(server);
    await enqueueCommand({
      payload: compose ? { compose } : {},
      serverId: parsed.data.serverId,
      type: compose ? "UPDATE_CONFIG" : "START",
    });
  } else {
    const payload =
      parsed.data.type === "RESTART"
        ? { clientIntentId: crypto.randomUUID() }
        : {};

    await enqueueCommand({
      payload,
      serverId: parsed.data.serverId,
      type: parsed.data.type,
    });
  }

  revalidatePath("/", "layout");

  return { ok: true };
};
