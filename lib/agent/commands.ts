import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import { prisma } from "@/lib/db";
import type { Command } from "@/protocol";
import { Prisma } from "@prisma/client";
import { ulid } from "ulid";

export const enqueueCommand = async (input: {
  serverId: string;
  type: Command["type"];
  payload: Record<string, unknown>;
  /**
   * Stable deduplication key (typically a workflow step ID). When supplied,
   * re-enqueues with the same key are treated as a no-op so step retries
   * don't double-queue commands.
   */
  idempotencyKey?: string;
}): Promise<Command> => {
  const id = input.idempotencyKey ? `cmd_${input.idempotencyKey}` : `cmd_${ulid()}`;
  const issuedAt = new Date();

  try {
    await prisma.command.create({
      data: {
        id,
        issuedAt,
        payload: input.payload as object,
        serverId: input.serverId,
        status: "pending",
        type: input.type,
      },
    });
  } catch (error) {
    if (
      input.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.command.findUniqueOrThrow({
        where: { id },
      });
      return {
        id: existing.id,
        issuedAt: existing.issuedAt.toISOString(),
        payload: existing.payload as Record<string, unknown>,
        type: existing.type as Command["type"],
      } as Command;
    }
    throw error;
  }

  return {
    id,
    issuedAt: issuedAt.toISOString(),
    payload: input.payload,
    type: input.type,
  } as Command;
};

export const claimPendingCommands = async (serverId: string, max = 5): Promise<Command[]> => {
  const pending = await prisma.command.findMany({
    orderBy: { issuedAt: "asc" },
    take: max,
    where: { serverId, status: "pending" },
  });

  if (pending.length === 0) {
    return [];
  }

  const ids = pending.map((c: { id: string }) => c.id);
  await prisma.command.updateMany({
    data: { deliveredAt: new Date(), status: "delivered" },
    where: { id: { in: ids } },
  });

  return pending.map(
    (command): Command =>
      ({
        id: command.id,
        issuedAt: command.issuedAt.toISOString(),
        payload: command.payload as Record<string, unknown>,
        type: command.type as Command["type"],
      }) as Command,
  );
};

export const waitForCommand = async (
  commandId: string,
  timeoutMs = 15_000,
): Promise<{
  status: "succeeded" | "failed" | "timeout";
  result?: Record<string, unknown>;
  error?: string;
}> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const command = await prisma.command.findUnique({
      where: { id: commandId },
    });
    if (!command) {
      return { error: "Command not found", status: "failed" };
    }
    if (command.status === "succeeded" || command.status === "failed") {
      return {
        error: command.error ?? undefined,
        result: (command.result as Record<string, unknown> | null) ?? undefined,
        status: command.status,
      };
    }
    await sleep(250);
  }
  return { status: "timeout" };
};

export const ackCommand = async (input: {
  commandId: string;
  status: "succeeded" | "failed";
  durationMs: number;
  result?: Record<string, unknown>;
  error?: string;
}): Promise<void> => {
  await prisma.command.update({
    data: {
      ackedAt: new Date(),
      durationMs: input.durationMs,
      error: input.error,
      result: input.result as object | undefined,
      status: input.status,
    },
    where: { id: input.commandId },
  });
};
