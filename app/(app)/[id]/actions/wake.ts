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

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id: parsed.data.serverId },
  });
  if (!server) {
    return { error: "Not found", ok: false };
  }
  if (server.observedState !== "hibernated") {
    return { error: "Server is not hibernated", ok: false };
  }
  if (!server.hibernationImageId) {
    return { error: "No hibernation snapshot found", ok: false };
  }

  await prisma.server.update({
    data: { desiredState: "running", observedState: "waking" },
    where: { id: parsed.data.serverId },
  });

  await start(wakeServer, [{ serverId: parsed.data.serverId }]);

  revalidatePath("/", "layout");
  return { ok: true };
};
