import 'server-only';
import { prisma } from '@/lib/db';
import type { Command } from '@/protocol';
import { ulid } from 'ulid';

export async function enqueueCommand(input: {
  serverId: string;
  type: Command['type'];
  payload: Record<string, unknown>;
}): Promise<Command> {
  const id = ulid();
  const issuedAt = new Date();

  await prisma.command.create({
    data: {
      id,
      serverId: input.serverId,
      type: input.type,
      payload: input.payload as object,
      status: 'pending',
      issuedAt,
    },
  });

  return {
    id,
    type: input.type,
    payload: input.payload,
    issuedAt: issuedAt.toISOString(),
  } as Command;
}

export async function claimPendingCommands(
  serverId: string,
  max = 5
): Promise<Command[]> {
  const pending = await prisma.command.findMany({
    where: { serverId, status: 'pending' },
    orderBy: { issuedAt: 'asc' },
    take: max,
  });

  if (pending.length === 0) return [];

  const ids = pending.map((c: { id: string }) => c.id);
  await prisma.command.updateMany({
    where: { id: { in: ids } },
    data: { status: 'delivered', deliveredAt: new Date() },
  });

  return pending.map(
    (command): Command =>
      ({
        id: command.id,
        type: command.type as Command['type'],
        payload: command.payload as Record<string, unknown>,
        issuedAt: command.issuedAt.toISOString(),
      }) as Command
  );
}

export async function ackCommand(input: {
  commandId: string;
  status: 'succeeded' | 'failed';
  durationMs: number;
  result?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  await prisma.command.update({
    where: { id: input.commandId },
    data: {
      status: input.status,
      ackedAt: new Date(),
      durationMs: input.durationMs,
      result: input.result as object | undefined,
      error: input.error,
    },
  });
}
