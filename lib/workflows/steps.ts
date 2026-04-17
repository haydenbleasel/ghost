import crypto from 'node:crypto';
import { mintBootstrapJwt } from '@/lib/agent/bootstrap';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { emitActivity } from '@/lib/events/emit';
import {
  createServer as createHetznerServer,
  deleteServer as deleteHetznerServer,
  getServer as getHetznerServer,
} from '@/lib/hetzner/client';
import { enqueueCommand } from '@/lib/agent/commands';
import { buildMinecraftCompose } from '@/games/minecraft/install';
import type { Phase } from '@/protocol';

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

  const server = await prisma.server.findUniqueOrThrow({ where: { id: serverId } });
  if (server.hetznerServerId) {
    return { hetznerServerId: Number(server.hetznerServerId) };
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

  const created = await createHetznerServer({
    name: hetznerName,
    userData,
    location: server.location,
    serverType: server.serverType,
  });

  await prisma.server.update({
    where: { id: serverId },
    data: {
      hetznerServerId: String(created.id),
      observedState: 'provisioning',
      phase: 'provisioning',
      ipv4: created.public_net.ipv4?.ip ?? null,
    },
  });

  await emitActivity({
    serverId,
    phase: 'provisioning',
    message: 'Creating Hetzner server',
    metadata: { hetznerServerId: created.id, location: server.location },
  });

  return { hetznerServerId: created.id };
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
  const agent = await prisma.agent.findUnique({ where: { serverId } });
  if (!agent) return { hadAgent: false };
  await enqueueCommand({ serverId, type: 'DELETE', payload: {} });
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
    const message = error instanceof Error ? error.message : 'unknown';
    if (!message.includes('404')) throw error;
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

export async function stepReadDesiredState(serverId: string) {
  'use step';
  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
    select: { desiredState: true },
  });
  return server.desiredState as 'running' | 'stopped' | 'deleted';
}

export type WaitPhaseTarget = Phase | Phase[];
