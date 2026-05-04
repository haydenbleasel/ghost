"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { enqueueCommand } from "@/lib/agent/commands";
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

  const payload =
    parsed.data.type === "RESTART"
      ? { clientIntentId: crypto.randomUUID() }
      : {};

  await enqueueCommand({
    payload,
    serverId: parsed.data.serverId,
    type: parsed.data.type,
  });

  revalidatePath("/dashboard", "layout");

  return { ok: true };
};
