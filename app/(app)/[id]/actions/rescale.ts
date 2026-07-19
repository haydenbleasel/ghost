"use server";

import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rescaleServer as rescaleServerWorkflow } from "@/lib/workflows/rescale-server";

const inputSchema = z.object({
  serverId: z.string().min(1),
  serverType: z.string().min(1),
});

export type RescaleServerInput = z.infer<typeof inputSchema>;

export type RescaleServerResult = { ok: true } | { error: string; ok: false };

export const rescaleServer = async (
  input: RescaleServerInput
): Promise<RescaleServerResult> => {
  await requireUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", ok: false };
  }
  const { serverId, serverType } = parsed.data;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id: serverId },
  });
  if (!server) {
    return { error: "Not found", ok: false };
  }
  if (!server.providerServerId) {
    return { error: "Server is not provisioned yet", ok: false };
  }
  if (serverType === server.serverType) {
    return { error: "Already on this server type", ok: false };
  }

  // Atomically claim the transition via phase so a double-click (or a click
  // racing hibernation, which briefly shows "stopped" too) can't start two
  // workflows. desiredState "stopped" excludes mid-hibernation claims.
  const { count } = await prisma.server.updateMany({
    data: { errorReason: null, phase: "rescaling" },
    where: {
      deletedAt: null,
      desiredState: "stopped",
      id: serverId,
      observedState: "stopped",
      phase: { not: "rescaling" },
      providerServerId: { not: null },
    },
  });
  if (count === 0) {
    return { error: "Server must be stopped before rescaling", ok: false };
  }

  try {
    await start(rescaleServerWorkflow, [{ serverId, serverType }]);
  } catch {
    // The workflow never started; release the claim so the server isn't
    // stranded in "rescaling" with nothing driving it.
    await prisma.server.updateMany({
      data: { phase: server.phase },
      where: { id: serverId, phase: "rescaling" },
    });
    return { error: "Failed to start rescale", ok: false };
  }

  revalidatePath("/", "layout");

  return { ok: true };
};
