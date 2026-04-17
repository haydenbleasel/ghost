import crypto from "node:crypto";
import { buildMinecraftCompose } from "@/games/minecraft/install";
import { mintBootstrapJwt } from "@/lib/agent/bootstrap";
import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { emitActivity } from "@/lib/events/emit";
import {
  createServer as createHetznerServer,
  deleteServer as deleteHetznerServer,
  getServer as getHetznerServer,
  HetznerApiError,
} from "@/lib/hetzner/client";
import type { Phase } from "@/protocol";
import { FatalError, getStepMetadata } from "workflow";
import { resumeHook } from "workflow/api";
import { hookTokens } from "./hook-tokens";

const safeResumeHook = async (token: string, payload?: unknown): Promise<void> => {
  try {
    await resumeHook(token, payload);
  } catch {
    // Hook not found: the target workflow either hasn't registered it yet
    // or has already exited. Either way, the signal is a no-op.
  }
};

const MINECRAFT_PORT_COMMENT = "# opened via ufw in cloud-init";

const buildCloudInit = (input: {
  serverId: string;
  bootstrapToken: string;
  apiBaseUrl: string;
}): string => {
  const bootstrap = {
    apiBaseUrl: input.apiBaseUrl,
    bootstrapToken: input.bootstrapToken,
    serverId: input.serverId,
  };

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
  - ufw allow 25565/tcp || true ${MINECRAFT_PORT_COMMENT}
`;
};

export const stepCreateHetznerServer = async (serverId: string) => {
  "use step";

  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
  });
  if (server.desiredState === "deleted") {
    return {
      cancelled: true as const,
      hetznerServerId: server.hetznerServerId ? Number(server.hetznerServerId) : null,
    };
  }
  if (server.hetznerServerId) {
    return {
      cancelled: false as const,
      hetznerServerId: Number(server.hetznerServerId),
    };
  }

  const { token, jti, expiresAt } = await mintBootstrapJwt({ serverId });

  await prisma.agentEnrollment.create({
    data: { expiresAt, jti, serverId },
  });

  const userData = buildCloudInit({
    apiBaseUrl: env.NEXT_PUBLIC_APP_URL,
    bootstrapToken: token,
    serverId,
  });

  const hetznerName = `ghost-${serverId.toLowerCase().slice(-12)}-${crypto
    .randomBytes(2)
    .toString("hex")}`;

  let created;
  try {
    created = await createHetznerServer({
      location: server.location,
      name: hetznerName,
      serverType: server.serverType,
      userData,
    });
  } catch (error) {
    if (error instanceof HetznerApiError && error.isClientError) {
      throw new FatalError(error.message);
    }
    throw error;
  }

  const updated = await prisma.server.update({
    data: {
      hetznerServerId: String(created.id),
      ipv4: created.public_net.ipv4?.ip ?? null,
      observedState: "provisioning",
      phase: "provisioning",
    },
    where: { id: serverId },
  });

  if (updated.desiredState === "deleted") {
    try {
      await deleteHetznerServer(created.id);
    } catch (error) {
      if (!(error instanceof HetznerApiError && error.status === 404)) {
        throw error;
      }
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

export const stepGetHetznerStatus = async (hetznerServerId: number) => {
  "use step";
  const server = await getHetznerServer(hetznerServerId);
  if (!server) {
    return { ip: null, status: "unknown" as const };
  }
  return {
    ip: server.public_net.ipv4?.ip ?? null,
    status: server.status,
  };
};

export const stepMarkHetznerRunning = async (input: { serverId: string; ipv4: string | null }) => {
  "use step";
  await prisma.server.update({
    data: { ipv4: input.ipv4, phase: "booting" },
    where: { id: input.serverId },
  });
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
  await prisma.server.update({
    data: { observedState: "provisioning", phase: "agent_connected" },
    where: { id: serverId },
  });
  await emitActivity({
    message: "Agent connected",
    phase: "agent_connected",
    serverId,
  });
};

export const stepSendInstallConfig = async (serverId: string) => {
  "use step";
  const { stepId } = getStepMetadata();
  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
  });

  const compose = buildMinecraftCompose({
    name: server.name,
    rconPassword: server.rconPassword,
  });

  await enqueueCommand({
    idempotencyKey: stepId,
    payload: { compose },
    serverId,
    type: "UPDATE_CONFIG",
  });

  await prisma.server.update({
    data: { phase: "installing" },
    where: { id: serverId },
  });

  await emitActivity({
    message: "Writing compose and pulling image",
    phase: "installing",
    serverId,
  });
};

export const stepReadPhase = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUniqueOrThrow({
    select: { desiredState: true, observedState: true, phase: true },
    where: { id: serverId },
  });
  return server;
};

export const stepMarkReady = async (serverId: string) => {
  "use step";
  await prisma.server.update({
    data: { observedState: "running", phase: "ready" },
    where: { id: serverId },
  });
  await emitActivity({
    message: "Server ready",
    phase: "ready",
    serverId,
  });
};

export const stepMarkFailed = async (input: { serverId: string; reason: string }) => {
  "use step";
  await prisma.server.update({
    data: { errorReason: input.reason, observedState: "failed" },
    where: { id: input.serverId },
  });
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
  try {
    await deleteHetznerServer(Number(server.hetznerServerId));
  } catch (error) {
    if (!(error instanceof HetznerApiError && error.status === 404)) {
      throw error;
    }
  }
  return { deleted: true };
};

export const stepMarkDeleted = async (serverId: string) => {
  "use step";
  await prisma.server.update({
    data: {
      deletedAt: new Date(),
      observedState: "deleted",
      phase: "deleted",
    },
    where: { id: serverId },
  });
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

export const stepSignalProvisionDone = async (serverId: string) => {
  "use step";
  await safeResumeHook(hookTokens.provisionDone(serverId));
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
