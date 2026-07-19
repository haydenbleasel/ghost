"use server";

import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { wakeServer } from "@/lib/workflows/wake-server";

const inputSchema = z.object({ serverId: z.string().min(1) });

export type WakeServerInput = z.infer<typeof inputSchema>;

export type WakeServerResult = { ok: true } | { error: string; ok: false };

export const wake = async (
  input: WakeServerInput
): Promise<WakeServerResult> => {
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
  if (!server.hibernationImageId) {
    return { error: "No hibernation snapshot found", ok: false };
  }

  // Atomically claim the transition so a double-click can't start two
  // workflows (two concurrent wakes could each create a VM). "failed" is
  // claimable so a wake that timed out can be retried; the workflow reuses
  // the existing VM when one survived the failed attempt.
  const { count } = await prisma.server.updateMany({
    data: {
      desiredState: "running",
      errorReason: null,
      observedState: "waking",
      phase: "waking",
    },
    where: {
      deletedAt: null,
      hibernationImageId: { not: null },
      id: serverId,
      observedState: { in: ["hibernated", "failed"] },
    },
  });
  if (count === 0) {
    return { error: "Server is not hibernated", ok: false };
  }

  try {
    await start(wakeServer, [{ serverId }]);
  } catch {
    // The workflow never started; put the row back so the server isn't
    // stranded in "waking" with nothing driving it.
    await prisma.server.updateMany({
      data: {
        desiredState: server.desiredState,
        errorReason: server.errorReason,
        observedState: server.observedState,
        phase: server.phase,
      },
      where: { id: serverId, observedState: "waking" },
    });
    return { error: "Failed to start wake", ok: false };
  }

  revalidatePath("/", "layout");
  return { ok: true };
};
