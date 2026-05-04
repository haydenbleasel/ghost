"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { MissingHetznerCredentialsError } from "@/lib/hetzner";
import { getUserHetznerContext } from "@/lib/hetzner/credentials";
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

  if (!server.hetznerServerId) {
    return { error: "Server is not provisioned yet", ok: false };
  }

  if (server.observedState !== "stopped") {
    return { error: "Server must be stopped before rescaling", ok: false };
  }

  if (parsed.data.serverType === server.serverType) {
    return { error: "Already on this server type", ok: false };
  }

  let client: Awaited<ReturnType<typeof getUserHetznerContext>>["client"];
  try {
    ({ client } = await getUserHetznerContext(user.id));
  } catch (error) {
    if (error instanceof MissingHetznerCredentialsError) {
      return {
        error: "Configure your Hetzner credentials in account settings.",
        ok: false,
      };
    }
    throw error;
  }

  const { error: apiError, response } = await client.POST(
    "/servers/{id}/actions/change_type",
    {
      body: { server_type: parsed.data.serverType, upgrade_disk: false },
      params: { path: { id: Number(server.hetznerServerId) } },
    }
  );
  if (!response.ok) {
    const errorBody = apiError as { error?: { message?: string } } | undefined;
    return {
      error: errorBody?.error?.message ?? response.statusText,
      ok: false,
    };
  }

  await prisma.server.update({
    data: { serverType: parsed.data.serverType },
    where: { id: parsed.data.serverId },
  });

  revalidatePath("/dashboard", "layout");

  return { ok: true, serverType: parsed.data.serverType };
};
