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

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id: parsed.data.serverId },
  });
  if (!server) {
    return { error: "Not found", ok: false };
  }
  if (!server.providerServerId) {
    return { error: "Server is not provisioned yet", ok: false };
  }
  if (
    server.observedState !== "running" &&
    server.observedState !== "stopped"
  ) {
    return {
      error: "Server must be running or stopped to hibernate",
      ok: false,
    };
  }

  await prisma.server.update({
    data: { desiredState: "hibernated", observedState: "hibernating" },
    where: { id: parsed.data.serverId },
  });

  await start(hibernateServer, [{ serverId: parsed.data.serverId }]);

  revalidatePath("/", "layout");
  return { ok: true };
};
