import crypto from 'node:crypto';
import { mintBootstrapJwt } from '@/lib/agent/bootstrap';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { emitActivity } from '@/lib/events/emit';
import {
  createServer as createHetznerServer,
  deleteServer as deleteHetznerServer,
  getServer as getHetznerServer,
  HetznerApiError,
} from '@/lib/hetzner/client';
import { enqueueCommand } from '@/lib/agent/commands';
import { buildMinecraftCompose } from '@/games/minecraft/install';
import type { Phase } from '@/protocol';
import { FatalError, getStepMetadata } from 'workflow';
import { resumeHook } from 'workflow/api';
import { hookTokens } from './hook-tokens';

async function safeResumeHook(token: string, payload: unknown): Promise<void> {
  try {
    await resumeHook(token, payload);
  } catch {
    // Hook not found: the target workflow either hasn't registered it yet
    // or has already exited. Either way, the signal is a no-op.
  }
}

const MINECRAFT_PORT_COMMENT = '# opened via ufw in cloud-init';

function buildCloudInit(input: {
  serverId: string;
  bootstrapToken: string;
  apiBaseUrl: string;
}): string {
  const bootstrap = {
    serverId: input.serverId,
    bootstrapToken: input.bootstrapToken,
    apiBaseUrl: input.apiBaseUrl,
  };

  return `#cloud-config
write_files:
  - path: /etc/ultrabeam/bootstrap.json
    owner: root:root
    permissions: '0600'
    content: |
      ${JSON.stringify(bootstrap)}
runcmd:
  - systemctl daemon-reload
  - systemctl enable --now ultrabeam-agent.service
  - ufw allow 25565/tcp || true ${MINECRAFT_PORT_COMMENT}
`;
}

export async function stepCreateHetznerServer(serverId: string) {
  'use step';

  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
  });
  if (server.desiredState === 'deleted') {
    return {
      hetznerServerId: server.hetznerServerId
        ? Number(server.hetznerServerId)
        : null,
      cancelled: true as const,
    };
  }
  if (server.hetznerServerId) {
    return {
      hetznerServerId: Number(server.hetznerServerId),
      cancelled: false as const,
    };
  }

  const { token, jti, expiresAt } = await mintBootstrapJwt({ serverId });

  await prisma.agentEnrollment.create({
    data: { jti, serverId, expiresAt },
  });

  const userData = buildCloudInit({
    serverId,
    bootstrapToken: token,
    apiBaseUrl: env.NEXT_PUBLIC_APP_URL,
  });

  const hetznerName = `ultrabeam-${serverId.toLowerCase().slice(-12)}-${crypto
    .randomBytes(2)
    .toString('hex')}`;

  let created;
  try {
    created = await createHetznerServer({
      name: hetznerName,
      userData,
      location: server.location,
      serverType: server.serverType,
    });
  } catch (error) {
    // 4xx from Hetzner (bad location/server_type/image, bad token, quota)
    // will never succeed on retry — fail fast.
    if (error instanceof HetznerApiError && error.isClientError) {
      throw new FatalError(error.message);
    }
    throw error;
  }

  // Persist the Hetzner ID first so teardown can find it even if we race.
  const updated = await prisma.server.update({
    where: { id: serverId },
    data: {
      hetznerServerId: String(created.id),
      observedState: 'provisioning',
      phase: 'provisioning',
      ipv4: created.public_net.ipv4?.ip ?? null,
    },
  });

  // Race guard: if teardown flipped desiredState while we were calling
  // Hetzner, delete the VM we just created instead of leaving it orphaned.
  if (updated.desiredState === 'deleted') {
    try {
      await deleteHetznerServer(created.id);
    } catch (error) {
      if (!(error instanceof HetznerApiError && error.status === 404)) {
        throw error;
      }
    }
    return { hetznerServerId: created.id, cancelled: true as const };
  }

  await emitActivity({
    serverId,
    phase: 'provisioning',
    message: 'Creating Hetzner server',
    metadata: { hetznerServerId: created.id, location: server.location },
  });

  return { hetznerServerId: created.id, cancelled: false as const };
}

export async function stepGetHetznerStatus(hetznerServerId: number) {
  'use step';
  const server = await getHetznerServer(hetznerServerId);
  if (!server) {
    return { status: 'unknown' as const, ip: null };
  }
  return {
    status: server.status,
    ip: server.public_net.ipv4?.ip ?? null,
  };
}

export async function stepMarkHetznerRunning(input: {
  serverId: string;
  ipv4: string | null;
}) {
  'use step';
  await prisma.server.update({
    where: { id: input.serverId },
    data: { ipv4: input.ipv4, phase: 'booting' },
  });
  await emitActivity({
    serverId: input.serverId,
    phase: 'booting',
    message: 'Waiting for VM boot and agent handshake',
    metadata: { ipv4: input.ipv4 },
  });
}

export async function stepReadAgent(serverId: string) {
  'use step';
  const agent = await prisma.agent.findUnique({
    where: { serverId },
    select: { id: true, lastHeartbeatAt: true, createdAt: true },
  });
  return agent;
}

export async function stepAgentConnected(serverId: string) {
  'use step';
  await prisma.server.update({
    where: { id: serverId },
    data: { phase: 'agent_connected', observedState: 'provisioning' },
  });
  await emitActivity({
    serverId,
    phase: 'agent_connected',
    message: 'Agent connected',
  });
}

export async function stepSendInstallConfig(serverId: string) {
  'use step';
  const { stepId } = getStepMetadata();
  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
  });

  const compose = buildMinecraftCompose({
    name: server.name,
    rconPassword: server.rconPassword,
  });

  await enqueueCommand({
    serverId,
    type: 'UPDATE_CONFIG',
    payload: { compose },
    idempotencyKey: stepId,
  });

  await prisma.server.update({
    where: { id: serverId },
    data: { phase: 'installing' },
  });

  await emitActivity({
    serverId,
    phase: 'installing',
    message: 'Writing compose and pulling image',
  });
}

export async function stepReadPhase(serverId: string) {
  'use step';
  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
    select: { phase: true, desiredState: true, observedState: true },
  });
  return server;
}

export async function stepMarkReady(serverId: string) {
  'use step';
  await prisma.server.update({
    where: { id: serverId },
    data: { phase: 'ready', observedState: 'running' },
  });
  await emitActivity({
    serverId,
    phase: 'ready',
    message: 'Server ready',
  });
}

export async function stepMarkFailed(input: { serverId: string; reason: string }) {
  'use step';
  await prisma.server.update({
    where: { id: input.serverId },
    data: { observedState: 'failed', phase: 'errored' },
  });
  await emitActivity({
    serverId: input.serverId,
    phase: 'errored',
    message: `Provision failed: ${input.reason}`,
    metadata: { reason: input.reason },
  });
}

export async function stepSendDeleteCommand(serverId: string) {
  'use step';
  const { stepId } = getStepMetadata();
  const agent = await prisma.agent.findUnique({ where: { serverId } });
  if (!agent) return { hadAgent: false };
  await enqueueCommand({
    serverId,
    type: 'DELETE',
    payload: {},
    idempotencyKey: stepId,
  });
  await emitActivity({
    serverId,
    phase: 'deleting',
    message: 'Stopping game and shutting down',
  });
  return { hadAgent: true };
}

export async function stepDeleteHetzner(serverId: string) {
  'use step';
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.hetznerServerId) return { deleted: false };
  try {
    await deleteHetznerServer(Number(server.hetznerServerId));
  } catch (error) {
    if (!(error instanceof HetznerApiError && error.status === 404)) {
      throw error;
    }
  }
  return { deleted: true };
}

export async function stepMarkDeleted(serverId: string) {
  'use step';
  await prisma.server.update({
    where: { id: serverId },
    data: {
      observedState: 'deleted',
      phase: 'deleted',
      deletedAt: new Date(),
    },
  });
  await emitActivity({
    serverId,
    phase: 'deleted',
    message: 'Server deleted',
  });
}

export async function stepSignalCancelProvision(serverId: string) {
  'use step';
  await safeResumeHook(hookTokens.cancel(serverId), undefined);
}

export async function stepSignalProvisionDone(serverId: string) {
  'use step';
  await safeResumeHook(hookTokens.provisionDone(serverId), undefined);
}

export async function stepReadDesiredState(serverId: string) {
  'use step';
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { desiredState: true },
  });
  if (!server) return 'deleted' as const;
  return server.desiredState as 'running' | 'stopped' | 'deleted';
}

export type WaitPhaseTarget = Phase | Phase[];
