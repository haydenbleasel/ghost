import 'server-only';
import { prisma } from '@/lib/db';
import type { Command } from '@/protocol';
import { Prisma } from '@prisma/client';
import { ulid } from 'ulid';

export async function enqueueCommand(input: {
  serverId: string;
  type: Command['type'];
  payload: Record<string, unknown>;
  /**
   * Stable deduplication key (typically a workflow step ID). When supplied,
   * re-enqueues with the same key are treated as a no-op so step retries
   * don't double-queue commands.
   */
  idempotencyKey?: string;
}): Promise<Command> {
  const id = input.idempotencyKey
    ? `cmd_${input.idempotencyKey}`
    : `cmd_${ulid()}`;
  const issuedAt = new Date();

  try {
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
  } catch (error) {
    if (
      input.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.command.findUniqueOrThrow({
        where: { id },
      });
      return {
        id: existing.id,
        type: existing.type as Command['type'],
        payload: existing.payload as Record<string, unknown>,
        issuedAt: existing.issuedAt.toISOString(),
      } as Command;
    }
    throw error;
  }

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
