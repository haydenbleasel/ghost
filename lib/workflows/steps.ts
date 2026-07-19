import crypto from "node:crypto";

import { FatalError, getStepMetadata } from "workflow";

import { buildUfwRules, getGame } from "@/games";
import type { GamePort } from "@/games";
import { mintBootstrapJwt } from "@/lib/agent/bootstrap";
import { enqueueCommand } from "@/lib/agent/commands";
import { buildServerCompose } from "@/lib/agent/compose";
import { prisma } from "@/lib/db";
import { API_URL, env, SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { emitActivity } from "@/lib/events/emit";
import { getProvider, getProviderWithImage } from "@/lib/providers";
import type {
  CreateServerInput,
  Provider,
  ProviderServer,
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

// Reserve the VM name in the database before calling the provider: a step
// retry reuses the reserved name, so a create whose response was lost
// resurfaces as a unique-name conflict (handled by createOrAdoptVm) instead
// of silently creating a second billed VM that nothing tracks.
const reserveVmName = async (serverId: string): Promise<string> => {
  const server = await prisma.server.findUniqueOrThrow({
    select: { pendingVmName: true },
    where: { id: serverId },
  });
  if (server.pendingVmName) {
    return server.pendingVmName;
  }
  const name = `ghost-${serverId.toLowerCase().slice(-12)}-${crypto
    .randomBytes(2)
    .toString("hex")}`;
  await prisma.server.update({
    data: { pendingVmName: name },
    where: { id: serverId },
  });
  return name;
};

const createOrAdoptVm = async (
  provider: Provider,
  input: CreateServerInput
): Promise<ProviderServer> => {
  try {
    return await provider.createServer(input);
  } catch (error) {
    if (error instanceof ProviderApiError && error.isClientError) {
      // 429 is a transient rate limit, not a rejected request — rethrow so
      // the step retries instead of permanently failing the server.
      if (error.status === 429) {
        throw error;
      }
      // The reserved name is random per attempt, so a VM already carrying it
      // can only be our own earlier create whose response was lost — adopt
      // it. Skip VMs mid-deletion; those can't be revived.
      const existing = await provider.getServerByName(input.name);
      if (existing && existing.status !== "deleting") {
        return existing;
      }
      throw new FatalError(error.message);
    }
    throw error;
  }
};

export const stepCreateProviderServer = async (serverId: string) => {
  "use step";

  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });
  if (!server || server.desiredState === "deleted") {
    // A previous attempt may have created the VM after teardown already
    // looked for it (and found nothing to delete) — clean it up here, since
    // nothing else will. deleteServer is a no-op when the VM is gone, and a
    // transient provider failure lets the step retry.
    if (server?.providerServerId) {
      await getProvider().deleteServer(server.providerServerId);
    } else if (server?.pendingVmName) {
      // The create may have succeeded without its id ever being persisted —
      // the VM is known only by its reserved name, and teardown's own
      // name-reap may have run before the VM existed.
      const orphan = await getProvider().getServerByName(server.pendingVmName);
      if (orphan) {
        await getProvider().deleteServer(orphan.id);
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

  let provider: Provider;
  let imageId: string;
  try {
    ({ imageId, provider } = await getProviderWithImage(SNAPSHOT_ENVIRONMENT));
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      throw new FatalError("No golden snapshot built for this environment");
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

  const name = await reserveVmName(serverId);
  const created = await createOrAdoptVm(provider, {
    imageId,
    location: server.location,
    name,
    serverType: server.serverType,
    userData,
  });

  const { count } = await prisma.server.updateMany({
    data: {
      ipv4: created.ipv4,
      observedState: "provisioning",
      pendingVmName: null,
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
      data: { pendingVmName: null, providerServerId: created.id },
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
  const server = await getProvider().getServer(input.providerServerId);
  if (!server) {
    // Distinct from the provider's own transient "unknown" status: only a
    // 404 (VM truly gone) may trigger vanished-VM handling — clearing the
    // reference on a mere "unknown" would orphan a live, billed VM.
    return { ip: null, status: "missing" as const };
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

  let memoryGb: number | null = null;
  if (server.providerServerId) {
    try {
      const providerServer = await getProvider().getServer(
        server.providerServerId
      );
      memoryGb = providerServer?.memoryGb ?? null;
    } catch {
      // Non-fatal: games fall back to a conservative default sizing.
    }
  }

  const compose = game.buildCompose(
    {
      joinPassword: server.joinPassword,
      memoryGb,
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
  if (!server) {
    return { deleted: false };
  }
  if (server.providerServerId) {
    return getProvider().deleteServer(server.providerServerId);
  }
  if (server.pendingVmName) {
    // A crash between the provider create and persisting its id can leave a
    // VM tracked only by its reserved name — this is the last chance to
    // reap it.
    const orphan = await getProvider().getServerByName(server.pendingVmName);
    if (orphan) {
      return getProvider().deleteServer(orphan.id);
    }
  }
  return { deleted: false };
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

export const stepReadObservedState = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({
    select: { observedState: true },
    where: { id: serverId },
  });
  return server?.observedState ?? null;
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
  return server.desiredState as
    | "running"
    | "stopped"
    | "hibernated"
    | "deleted";
};

export type WaitPhaseTarget = Phase | Phase[];

export const stepSendStopCommand = async (serverId: string) => {
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
    type: "STOP",
  });
  await emitActivity({
    message: "Stopping game for hibernation",
    phase: "hibernating",
    serverId,
  });
  return { hadAgent: true };
};

export const stepShutdownProviderServer = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.providerServerId) {
    return { ok: false as const };
  }
  await getProvider().shutdownServer(server.providerServerId);
  return { ok: true as const, providerServerId: server.providerServerId };
};

export const stepPoweroffProviderServer = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.providerServerId) {
    return { ok: false as const };
  }
  await getProvider().poweroffServer(server.providerServerId);
  return { ok: true as const };
};

export const stepCreateHibernationSnapshot = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.providerServerId) {
    throw new FatalError("Cannot snapshot a server with no provider VM");
  }
  if (server.hibernationImageId) {
    return { imageId: server.hibernationImageId };
  }
  const description = `ghost-hibernation-${serverId}`;
  // A retried step whose previous createSnapshot succeeded but never
  // persisted its id would otherwise create a second snapshot and orphan the
  // first (billed per-GB forever) — adopt the existing one instead.
  const images = await getProvider().listImagesForServer(
    server.providerServerId
  );
  const existing = images.find(
    (image) =>
      image.type === "snapshot" &&
      image.description === description &&
      image.status !== "unavailable"
  );
  const imageId =
    existing?.id ??
    (await getProvider().createSnapshot(server.providerServerId, {
      description,
    }));
  await prisma.server.update({
    data: { hibernationImageId: imageId },
    where: { id: serverId },
  });
  await emitActivity({
    message: "Creating snapshot",
    metadata: { imageId },
    phase: "hibernating",
    serverId,
  });
  return { imageId };
};

export const stepGetSnapshotStatus = async (input: {
  serverId: string;
  imageId: string;
}) => {
  "use step";
  // "missing" (deleted out from under us) is distinct from a bad status so
  // the workflow can clear the dangling image id; transient provider errors
  // throw and retry the step instead of masquerading as either.
  const image = await getProvider().getImage(input.imageId);
  if (!image) {
    return { status: "missing" as const };
  }
  return { status: image.status };
};

export const stepDeleteProviderServerForHibernation = async (
  serverId: string
) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.providerServerId) {
    return { deleted: false };
  }
  await getProvider().deleteServer(server.providerServerId);
  await prisma.server.update({
    data: {
      hibernatedAt: new Date(),
      ipv4: null,
      observedState: "hibernated",
      phase: "hibernated",
      providerServerId: null,
    },
    where: { id: serverId },
  });
  await emitActivity({
    message: "VM released; snapshot retained",
    phase: "hibernated",
    serverId,
  });
  return { deleted: true };
};

export const stepCreateProviderServerFromSnapshot = async (
  serverId: string
) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server || server.desiredState !== "running") {
    // Mirror stepCreateProviderServer: a previous attempt may have created
    // the VM after teardown already looked for it — reap it here, whether it
    // is known by id or only by its reserved name.
    if (server?.desiredState === "deleted") {
      if (server.providerServerId) {
        await getProvider().deleteServer(server.providerServerId);
      } else if (server.pendingVmName) {
        const orphan = await getProvider().getServerByName(
          server.pendingVmName
        );
        if (orphan) {
          await getProvider().deleteServer(orphan.id);
        }
      }
    }
    return { cancelled: true as const };
  }
  if (server.providerServerId) {
    // A VM that survived a failed hibernation attempt sits powered off;
    // nothing else in the wake flow powers it on, so without this the boot
    // wait below would poll an "off" VM until it times out.
    const existing = await getProvider().getServer(server.providerServerId);
    if (existing?.status === "off") {
      await getProvider().poweronServer(server.providerServerId);
    }
    return {
      cancelled: false as const,
      providerServerId: server.providerServerId,
    };
  }
  if (!server.hibernationImageId) {
    throw new FatalError("Cannot wake server without a hibernation snapshot");
  }
  const provider = getProvider();

  const name = await reserveVmName(serverId);
  const created = await createOrAdoptVm(provider, {
    imageId: server.hibernationImageId,
    location: server.location,
    name,
    serverType: server.serverType,
    userData: "",
  });

  const { count } = await prisma.server.updateMany({
    data: {
      ipv4: created.ipv4,
      observedState: "waking",
      pendingVmName: null,
      phase: "waking",
      providerServerId: created.id,
    },
    where: { desiredState: "running", id: serverId },
  });

  if (count === 0) {
    // Deleted (or otherwise cancelled) while the create was in flight.
    // Persist the id without clobbering teardown's state so the cancelled
    // path above can retry the cleanup if this inline delete fails.
    await prisma.server.updateMany({
      data: { pendingVmName: null, providerServerId: created.id },
      where: { id: serverId },
    });
    await provider.deleteServer(created.id);
    return { cancelled: true as const };
  }

  await emitActivity({
    message: "Restoring VM from snapshot",
    metadata: { providerServerId: created.id },
    phase: "waking",
    serverId,
  });
  return { cancelled: false as const, providerServerId: created.id };
};

export const stepClearVanishedProviderServer = async (serverId: string) => {
  "use step";
  // The VM 404'd at the provider: drop the dangling reference so a wake
  // retry recreates it from the snapshot instead of polling a ghost.
  await prisma.server.updateMany({
    data: { ipv4: null, providerServerId: null },
    where: { id: serverId },
  });
};

export const stepWaitAgentReconnected = async (serverId: string) => {
  "use step";
  const agent = await prisma.agent.findUnique({
    select: { lastHeartbeatAt: true },
    where: { serverId },
  });
  if (!agent?.lastHeartbeatAt) {
    return { reconnected: false };
  }
  const reconnected =
    Date.now() - agent.lastHeartbeatAt.getTime() < AGENT_LIVENESS_WINDOW_MS;
  return { reconnected };
};

export const stepDeleteHibernationSnapshot = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.hibernationImageId) {
    return { deleted: false };
  }
  await getProvider().deleteImage(server.hibernationImageId);
  await prisma.server.update({
    data: { hibernatedAt: null, hibernationImageId: null },
    where: { id: serverId },
  });
  return { deleted: true };
};

export const stepMarkAwake = async (serverId: string) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: { observedState: "running", phase: "ready" },
    where: { id: serverId },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: "Server back online",
    phase: "ready",
    serverId,
  });
};

export const stepSendWakeStartCommand = async (serverId: string) => {
  "use step";
  const { stepId } = getStepMetadata();
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server || server.desiredState !== "running") {
    return;
  }
  // Hibernation stops the game container manually before the snapshot, and
  // Docker's `unless-stopped` policy never restarts a manually-stopped
  // container — so the restored VM boots with the game down. Start it
  // explicitly, with a freshly built compose so settings saved while
  // hibernated are applied (mirrors the START action).
  const compose = await buildServerCompose(server);
  await enqueueCommand({
    idempotencyKey: stepId,
    payload: compose ? { compose } : {},
    serverId,
    type: compose ? "UPDATE_CONFIG" : "START",
  });
  await emitActivity({
    message: "Starting game after wake",
    phase: "starting",
    serverId,
  });
};

export const stepMarkHibernating = async (serverId: string) => {
  "use step";
  // The agent's "stopped" event lands on observedState during the stop
  // drain; re-assert "hibernating" so the UI doesn't offer Start (and the
  // hibernate action can't claim the row again) while the VM is shut down
  // and snapshotted.
  await prisma.server.updateMany({
    data: { observedState: "hibernating" },
    where: {
      desiredState: "hibernated",
      id: serverId,
      observedState: "stopped",
    },
  });
};

export const stepChangeServerType = async (input: {
  serverId: string;
  serverType: string;
}) => {
  "use step";
  const server = await prisma.server.findUnique({
    where: { id: input.serverId },
  });
  if (!server?.providerServerId) {
    throw new FatalError("Server has no provider VM to rescale");
  }
  try {
    await getProvider().rescaleServer(
      server.providerServerId,
      input.serverType
    );
  } catch (error) {
    if (
      error instanceof ProviderApiError &&
      error.isClientError &&
      error.status !== 429
    ) {
      throw new FatalError(error.message);
    }
    throw error;
  }
  await prisma.server.update({
    data: { serverType: input.serverType },
    where: { id: input.serverId },
  });
};

export const stepPoweronProviderServer = async (serverId: string) => {
  "use step";
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.providerServerId) {
    return { ok: false as const };
  }
  await getProvider().poweronServer(server.providerServerId);
  return { ok: true as const };
};

export const stepMarkRescaled = async (input: {
  serverId: string;
  serverType: string;
}) => {
  "use step";
  const { count } = await prisma.server.updateMany({
    data: { errorReason: null, phase: "ready" },
    where: { id: input.serverId, phase: "rescaling" },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: `Rescaled to ${input.serverType}`,
    metadata: { serverType: input.serverType },
    phase: "ready",
    serverId: input.serverId,
  });
};

export const stepMarkRescaleFailed = async (input: {
  serverId: string;
  reason: string;
}) => {
  "use step";
  const server = await prisma.server.findUnique({
    where: { id: input.serverId },
  });
  if (server?.providerServerId) {
    // Best-effort: bring the VM back up so a failed rescale doesn't leave
    // the server powered off with nothing driving it.
    try {
      await getProvider().poweronServer(server.providerServerId);
    } catch {
      // The VM may already be on (or gone); the user can still retry.
    }
  }
  const { count } = await prisma.server.updateMany({
    data: { errorReason: input.reason, phase: "ready" },
    where: {
      desiredState: { not: "deleted" },
      id: input.serverId,
      phase: "rescaling",
    },
  });
  if (count === 0) {
    return;
  }
  await emitActivity({
    message: `Rescale failed: ${input.reason}`,
    metadata: { reason: input.reason },
    phase: "errored",
    serverId: input.serverId,
  });
};
