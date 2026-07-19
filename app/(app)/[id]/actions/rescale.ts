"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderApiError } from "@/lib/providers/errors";
import { requireUser } from "@/lib/session";

const inputSchema = z.object({
  serverId: z.string().min(1),
  serverType: z.string().min(1),
});

export type RescaleServerInput = z.infer<typeof inputSchema>;

export type RescaleServerResult =
  | { ok: true; serverType: string }
  | { error: string; ok: false };

export const rescaleServer = async (
  input: RescaleServerInput
): Promise<RescaleServerResult> => {
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

  if (server.observedState !== "stopped") {
    return { error: "Server must be stopped before rescaling", ok: false };
  }

  if (parsed.data.serverType === server.serverType) {
    return { error: "Already on this server type", ok: false };
  }

  const provider = getProvider();

  try {
    await provider.rescaleServer(
      server.providerServerId,
      parsed.data.serverType
    );
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return { error: error.message, ok: false };
    }
    throw error;
  }

  await prisma.server.update({
    data: { serverType: parsed.data.serverType },
    where: { id: parsed.data.serverId },
  });

  revalidatePath("/", "layout");

  return { ok: true, serverType: parsed.data.serverType };
};
