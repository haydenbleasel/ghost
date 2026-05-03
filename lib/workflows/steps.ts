import crypto from "node:crypto";

import { FatalError, getStepMetadata } from "workflow";
import { resumeHook } from "workflow/api";

import { buildUfwRules, getGame } from "@/games";
import type { GamePort } from "@/games";
import { mintBootstrapJwt } from "@/lib/agent/bootstrap";
import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { emitActivity } from "@/lib/events/emit";
import {
  type HetznerClient,
  HetznerApiError,
  throwIfHetznerError,
} from "@/lib/hetzner";
import { getUserHetznerContext } from "@/lib/hetzner/credentials";
import type { Phase } from "@/protocol";

import { hookTokens } from "./hook-tokens";

const safeResumeHook = async (
  token: string,
  payload?: unknown
): Promise<void> => {
  try {
    await resumeHook(token, payload);
  } catch {
    // Hook not found: the target workflow either hasn't registered it yet
    // or has already exited. Either way, the signal is a no-op.
  }
};

const postCreateHetznerServer = async (input: {
  client: HetznerClient;
  image: string;
  location: string;
  name: string;
  serverType: string;
  userData: string;
}) => {
  const { data, error, response } = await input.client.POST("/servers", {
    body: {
      image: input.image,
      location: input.location,
      name: input.name,
      public_net: { enable_ipv4: true, enable_ipv6: false },
      server_type: input.serverType,
      start_after_create: true,
      user_data: input.userData,
    },
  });
  if (!response.ok) {
    const body = error as
      | { error?: { code?: string; message?: string } }
      | undefined;
    const code = body?.error?.code ?? String(response.status);
    const message = body?.error?.message ?? response.statusText;
    const apiError = new HetznerApiError(response.status, code, message);
    if (apiError.isClientError) {
      throw new FatalError(apiError.message);
    }
    throw apiError;
  }
  if (!data?.server) {
    throw new Error("Hetzner server creation returned no server");
  }
  return data.server;
};

const buildCloudInit = (input: {
  serverId: string;
  bootstrapToken: string;
  apiBaseUrl: string;
  ports: readonly GamePort[];
}): string => {
  const bootstrap = {
    apiBaseUrl: input.apiBaseUrl,
    bootstrapToken: input.bootstrapToken,
    serverId: input.serverId,
  };
  const ufwRules = buildUfwRules(input.ports)
    .map((rule) => `  - ${rule}`)
    .join("\n");

  return `#cloud-config
write_files:
  - path: /etc/ghost/bootstrap.json
    owner: root:root
    permissions: '0600'
    content: |
      ${JSON.stringify(bootstrap)}
runcmd:
  - systemctl daemon-reload
  - systemctl enable --now ghost-agent.service
${ufwRules}
`;
};

export const stepCreateHetznerServer = async (serverId: string) => {
  "use step";

  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });
  if (!server || server.desiredState === "deleted") {
    return {
      cancelled: true as const,
      hetznerServerId: server?.hetznerServerId
        ? Number(server.hetznerServerId)
        : null,
    };
  }
  if (server.hetznerServerId) {
    return {
      cancelled: false as const,
      hetznerServerId: Number(server.hetznerServerId),
    };
  }

  const game = getGame(server.game);
  if (!game) {
    throw new FatalError(`Unknown game: ${server.game}`);
  }

  let hetzner: HetznerClient;
  let imageId: string;
  try {
    const ctx = await getUserHetznerContext(server.userId);
    hetzner = ctx.client;
    imageId = ctx.imageId;
  } catch {
    throw new FatalError("Owner has not configured Hetzner credentials");
  }

  const { token, jti, expiresAt } = await mintBootstrapJwt({ serverId });

  await prisma.agentEnrollment.create({
    data: { expiresAt, jti, serverId },
  });

  const userData = buildCloudInit({
    apiBaseUrl: env.NEXT_PUBLIC_APP_URL,
    bootstrapToken: token,
    ports: game.ports,
    serverId,
  });

  const hetznerName = `ghost-${serverId.toLowerCase().slice(-12)}-${crypto
    .randomBytes(2)
    .toString("hex")}`;

  const created = await postCreateHetznerServer({
    client: hetzner,
    image: imageId,
    location: server.location,
    name: hetznerName,
    serverType: server.serverType,
    userData,
  });

  const { count } = await prisma.server.updateMany({
    data: {
      hetznerServerId: String(created.id),
      ipv4: created.public_net.ipv4?.ip ?? null,
      observedState: "provisioning",
      phase: "provisioning",
    },
    where: { id: serverId },
  });
  const updated =
    count > 0
      ? await prisma.server.findUnique({
          select: { desiredState: true },
          where: { id: serverId },
        })
      : null;

  if (!updated || updated.desiredState === "deleted") {
    const { error: delError, response: delResponse } = await hetzner.DELETE(
      "/servers/{id}",
      {
        params: { path: { id: created.id } },
      }
    );
    if (!delResponse.ok && delResponse.status !== 404) {
      throwIfHetznerError(delError, delResponse);
    }
    return { cancelled: true as const, hetznerServerId: created.id };
  }

  await emitActivity({
    message: "Creating Hetzner server",
    metadata: { hetznerServerId: created.id, location: server.location },
    phase: "provisioning",
    serverId,
  });

  return { cancelled: false as const, hetznerServerId: created.id };
};

export const stepGetHetznerStatus = async (input: {
  serverId: string;
  hetznerServerId: number;
}) => {
  "use step";
  const owner = await prisma.server.findUnique({
    select: { userId: true },
    where: { id: input.serverId },
  });
  if (!owner) {
    return { ip: null, status: "unknown" as const };
  }
  const { client } = await getUserHetznerContext(owner.userId);
  const { data, error, response } = await client.GET("/servers/{id}", {
    params: { path: { id: input.hetznerServerId } },
  });
  if (response.status === 404) {
    return { ip: null, status: "unknown" as const };
  }
  if (!response.ok) {
    throwIfHetznerError(error, response);
  }
  const server = data?.server;
  if (!server) {
    return { ip: null, status: "unknown" as const };
  }
  return {
    ip: server.public_net.ipv4?.ip ?? null,
    status: server.status,
  };
};

export const stepMarkHetznerRunning = async (input: {
  serverId: string;
  ipv4: string | null;
}) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: { ipv4: input.ipv4, phase: "booting" },
    where: { id: input.serverId },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: "Waiting for VM boot and agent handshake",
    metadata: { ipv4: input.ipv4 },
    phase: "booting",
    serverId: input.serverId,
  });
};

export const stepReadAgent = async (serverId: string) => {
  "use step";
  const agent = await prisma.agent.findUnique({
    select: { createdAt: true, id: true, lastHeartbeatAt: true },
    where: { serverId },
  });
  return agent;
};

export const stepAgentConnected = async (serverId: string) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: { observedState: "provisioning", phase: "agent_connected" },
    where: { id: serverId },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: "Agent connected",
    phase: "agent_connected",
    serverId,
  });
};

export const stepSendInstallConfig = async (serverId: string) => {
  "use step";
  const { stepId } = getStepMetadata();
  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });
  if (!server) {
    return;
  }

  const game = getGame(server.game);
  if (!game) {
    throw new FatalError(`Unknown game: ${server.game}`);
  }

  const compose = game.buildCompose(
    {
      name: server.name,
      rconPassword: server.rconPassword,
    },
    server.settings
  );

  await enqueueCommand({
    idempotencyKey: stepId,
    payload: { compose },
    serverId,
    type: "UPDATE_CONFIG",
  });

  const { count } = await prisma.server.updateMany({
    data: { phase: "installing" },
    where: { id: serverId },
  });
  if (count === 0) {
    return;
  }

  await emitActivity({
    message: "Writing compose and pulling image",
    phase: "installing",
    serverId,
  });
};

export const stepMarkReady = async (serverId: string) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: { observedState: "running", phase: "ready" },
    where: { id: serverId },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: "Server ready",
    phase: "ready",
    serverId,
  });
};

export const stepMarkFailed = async (input: {
  serverId: string;
  reason: string;
}) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: { errorReason: input.reason, observedState: "failed" },
    where: { id: input.serverId },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: `Provision failed: ${input.reason}`,
    metadata: { reason: input.reason },
    phase: "errored",
    serverId: input.serverId,
  });
};

export const stepSendDeleteCommand = async (serverId: string) => {
  "use step";
  const { stepId } = getStepMetadata();
  const agent = await prisma.agent.findUnique({ where: { serverId } });
  if (!agent) {
    return { hadAgent: false };
  }
  await enqueueCommand({
    idempotencyKey: stepId,
    payload: {},
    serverId,
    type: "DELETE",
  });
  await emitActivity({
    message: "Stopping game and shutting down",
    phase: "deleting",
    serverId,
  });
  return { hadAgent: true };
};

export const stepDeleteHetzner = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.hetznerServerId) {
    return { deleted: false };
  }
  let client: HetznerClient;
  try {
    ({ client } = await getUserHetznerContext(server.userId));
  } catch {
    // Owner cleared their token; mark deleted in DB anyway since we can't
    // reach Hetzner. The VM may need to be cleaned up manually.
    return { deleted: false };
  }
  const { error, response } = await client.DELETE("/servers/{id}", {
    params: { path: { id: Number(server.hetznerServerId) } },
  });
  if (!response.ok && response.status !== 404) {
    throwIfHetznerError(error, response);
  }
  return { deleted: true };
};

export const stepMarkDeleted = async (serverId: string) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: {
      deletedAt: new Date(),
      observedState: "deleted",
      phase: "deleted",
    },
    where: { id: serverId },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: "Server deleted",
    phase: "deleted",
    serverId,
  });
};

export const stepSignalCancelProvision = async (serverId: string) => {
  "use step";
  await safeResumeHook(hookTokens.cancel(serverId));
};

export const stepReadPhase = async (
  serverId: string
): Promise<Phase | null> => {
  "use step";
  const server = await prisma.server.findUnique({
    select: { phase: true },
    where: { id: serverId },
  });
  return (server?.phase as Phase | undefined) ?? null;
};

export const stepReadDesiredState = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({
    select: { desiredState: true },
    where: { id: serverId },
  });
  if (!server) {
    return "deleted" as const;
  }
  return server.desiredState as "running" | "stopped" | "deleted";
};

export type WaitPhaseTarget = Phase | Phase[];
