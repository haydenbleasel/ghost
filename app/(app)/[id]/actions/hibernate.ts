"use server";

import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hibernateServer } from "@/lib/workflows/hibernate-server";

const inputSchema = z.object({ serverId: z.string().min(1) });

export type HibernateServerInput = z.infer<typeof inputSchema>;

export type HibernateServerResult = { ok: true } | { error: string; ok: false };

export const hibernate = async (
  input: HibernateServerInput
): Promise<HibernateServerResult> => {
  await requireUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", ok: false };
  }
  const { serverId } = parsed.data;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id: serverId },
  });
  if (!server) {
    return { error: "Not found", ok: false };
  }
  if (!server.providerServerId) {
    return { error: "Server is not provisioned yet", ok: false };
  }

  // Atomically claim the transition so a double-click can't start two
  // workflows. "failed" is only claimable when the failure came from a
  // hibernation attempt (desiredState is still "hibernated"), never from a
  // failed provision.
  const { count } = await prisma.server.updateMany({
    data: {
      desiredState: "hibernated",
      errorReason: null,
      observedState: "hibernating",
      phase: "hibernating",
    },
    where: {
      OR: [
        { observedState: { in: ["running", "stopped"] } },
        { desiredState: "hibernated", observedState: "failed" },
      ],
      deletedAt: null,
      id: serverId,
      providerServerId: { not: null },
    },
  });
  if (count === 0) {
    return {
      error: "Server must be running or stopped to hibernate",
      ok: false,
    };
  }

  try {
    await start(hibernateServer, [{ serverId }]);
  } catch {
    // The workflow never started; put the row back so the server isn't
    // stranded in "hibernating" with nothing driving it.
    await prisma.server.updateMany({
      data: {
        desiredState: server.desiredState,
        errorReason: server.errorReason,
        observedState: server.observedState,
        phase: server.phase,
      },
      where: { id: serverId, observedState: "hibernating" },
    });
    return { error: "Failed to start hibernation", ok: false };
  }

  revalidatePath("/", "layout");
  return { ok: true };
};
