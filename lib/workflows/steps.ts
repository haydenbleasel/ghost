import crypto from "node:crypto";

import { FatalError, getStepMetadata } from "workflow";

import { buildUfwRules, getGame } from "@/games";
import type { GamePort } from "@/games";
import { mintBootstrapJwt } from "@/lib/agent/bootstrap";
import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { API_URL, env, SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { emitActivity } from "@/lib/events/emit";
import {
  getProviderForUser,
  getProviderForUserWithImage,
} from "@/lib/providers";
import {
  MissingProviderCredentialsError,
  ProviderApiError,
} from "@/lib/providers/errors";
import type { Phase } from "@/protocol";

const buildCloudInit = (input: {
  serverId: string;
  bootstrapToken: string;
  apiBaseUrl: string;
  ports: readonly GamePort[];
  vercelProtectionBypass: string | null;
}): string => {
  const bootstrap = {
    apiBaseUrl: input.apiBaseUrl,
    bootstrapToken: input.bootstrapToken,
    serverId: input.serverId,
    // Set on preview deployments so the agent can punch through Vercel's
    // deployment protection on every callback. Null on prod (no auth wall) and
    // local dev (no protection layer in front).
    vercelProtectionBypass: input.vercelProtectionBypass,
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

export const stepCreateProviderServer = async (serverId: string) => {
  "use step";

  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });
  if (!server || server.desiredState === "deleted") {
    // A previous attempt may have created the VM after teardown already
    // looked for it (and found nothing to delete) — clean it up here, since
    // nothing else will. deleteServer is a no-op when the VM is gone.
    if (server?.providerServerId) {
      try {
        const provider = await getProviderForUser(server.userId);
        await provider.deleteServer(server.providerServerId);
      } catch (error) {
        if (!(error instanceof MissingProviderCredentialsError)) {
          // Let the step retry until the provider is reachable again.
          throw error;
        }
      }
    }
    return {
      cancelled: true as const,
      providerServerId: server?.providerServerId ?? null,
    };
  }
  if (server.providerServerId) {
    return {
      cancelled: false as const,
      providerServerId: server.providerServerId,
    };
  }

  const game = getGame(server.game);
  if (!game) {
    throw new FatalError(`Unknown game: ${server.game}`);
  }

  let provider: Awaited<
    ReturnType<typeof getProviderForUserWithImage>
  >["provider"];
  let imageId: string;
  try {
    ({ imageId, provider } = await getProviderForUserWithImage(
      server.userId,
      SNAPSHOT_ENVIRONMENT
    ));
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      throw new FatalError("Owner has not configured provider credentials");
    }
    // Transient failures (DB, network) should retry, not permanently fail
    // the provision with a misleading reason.
    throw error;
  }

  const { token, jti, expiresAt } = await mintBootstrapJwt({ serverId });

  await prisma.agentEnrollment.create({
    data: { expiresAt, jti, serverId },
  });

  const userData = buildCloudInit({
    apiBaseUrl: API_URL,
    bootstrapToken: token,
    ports: game.ports,
    serverId,
    vercelProtectionBypass:
      env.VERCEL_ENV === "production"
        ? null
        : (env.VERCEL_AUTOMATION_BYPASS_SECRET ?? null),
  });

  const name = `ghost-${serverId.toLowerCase().slice(-12)}-${crypto
    .randomBytes(2)
    .toString("hex")}`;

  let created: Awaited<ReturnType<typeof provider.createServer>>;
  try {
    created = await provider.createServer({
      imageId,
      location: server.location,
      name,
      serverType: server.serverType,
      userData,
    });
  } catch (error) {
    if (error instanceof ProviderApiError && error.isClientError) {
      throw new FatalError(error.message);
    }
    throw error;
  }

  const { count } = await prisma.server.updateMany({
    data: {
      ipv4: created.ipv4,
      observedState: "provisioning",
      phase: "provisioning",
      providerServerId: created.id,
    },
    where: { desiredState: { not: "deleted" }, id: serverId },
  });

  if (count === 0) {
    // Deleted while the create was in flight. Persist the id (without
    // clobbering teardown's phase/state) so the early-return path above can
    // retry the cleanup if this inline delete fails.
    await prisma.server.updateMany({
      data: { providerServerId: created.id },
      where: { id: serverId },
    });
    await provider.deleteServer(created.id);
    return { cancelled: true as const, providerServerId: created.id };
  }

  await emitActivity({
    message: "Creating provider server",
    metadata: { location: server.location, providerServerId: created.id },
    phase: "provisioning",
    serverId,
  });

  return { cancelled: false as const, providerServerId: created.id };
};

export const stepGetServerStatus = async (input: {
  serverId: string;
  providerServerId: string;
}) => {
  "use step";
  const owner = await prisma.server.findUnique({
    select: { userId: true },
    where: { id: input.serverId },
  });
  if (!owner) {
    return { ip: null, status: "unknown" as const };
  }
  const provider = await getProviderForUser(owner.userId);
  const server = await provider.getServer(input.providerServerId);
  if (!server) {
    return { ip: null, status: "unknown" as const };
  }
  return {
    ip: server.ipv4,
    status: server.status,
  };
};

export const stepMarkServerRunning = async (input: {
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
      joinPassword: server.joinPassword,
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
  // Skip servers the user has deleted: a teardown racing this workflow must
  // not have its "deleted" state overwritten with "failed".
  const { count } = await prisma.server.updateMany({
    data: { errorReason: input.reason, observedState: "failed" },
    where: { desiredState: { not: "deleted" }, id: input.serverId },
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

const AGENT_LIVENESS_WINDOW_MS = 60_000;

export const stepSendDeleteCommand = async (serverId: string) => {
  "use step";
  const { stepId } = getStepMetadata();
  const agent = await prisma.agent.findUnique({ where: { serverId } });
  if (!agent) {
    return { hadAgent: false };
  }
  const lastHeartbeat = agent.lastHeartbeatAt?.getTime() ?? 0;
  if (Date.now() - lastHeartbeat > AGENT_LIVENESS_WINDOW_MS) {
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

export const stepDeleteProviderServer = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.providerServerId) {
    return { deleted: false };
  }
  let provider: Awaited<ReturnType<typeof getProviderForUser>>;
  try {
    provider = await getProviderForUser(server.userId);
  } catch {
    // Owner cleared their token; mark deleted in DB anyway since we can't
    // reach the provider. The VM may need to be cleaned up manually.
    return { deleted: false };
  }
  return provider.deleteServer(server.providerServerId);
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

export const stepReadAgentPhase = async (
  serverId: string
): Promise<Phase | null> => {
  "use step";
  const event = await prisma.activityEvent.findFirst({
    orderBy: { seq: "desc" },
    select: { phase: true },
    where: { serverId, source: "agent" },
  });
  return (event?.phase as Phase | undefined) ?? null;
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
