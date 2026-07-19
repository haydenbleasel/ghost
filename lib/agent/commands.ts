import "server-only";
import { setTimeout as sleep } from "node:timers/promises";

import { Prisma } from "@prisma/client";
import { ulid } from "ulid";

import { prisma } from "@/lib/db";
import type { Command } from "@/protocol";

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
  const id = input.idempotencyKey
    ? `cmd_${input.idempotencyKey}`
    : `cmd_${ulid()}`;
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

// How long a "delivered" command may sit un-acked before it is re-served.
// Delivery is not receipt: if the long-poll response carrying a command is
// lost, the row would otherwise be stuck "delivered" forever with no
// redelivery path. The agent dedupes re-executions by command id, and it
// executes serially (it doesn't poll while a command runs), so a stale
// delivery genuinely means the agent never got it or its ack was lost.
const REDELIVER_AFTER_MS = 60_000;

export const claimPendingCommands = async (
  serverId: string,
  max = 5
): Promise<Command[]> => {
  const pending = await prisma.command.findMany({
    orderBy: { issuedAt: "asc" },
    take: max,
    where: {
      OR: [
        { status: "pending" },
        {
          deliveredAt: { lt: new Date(Date.now() - REDELIVER_AFTER_MS) },
          status: "delivered",
        },
      ],
      serverId,
    },
  });

  if (pending.length === 0) {
    return [];
  }

  // Claim each row conditionally so two overlapping polls (e.g. an agent
  // retry racing a still-running long-poll) can never both deliver the same
  // command: only the caller whose update flips the row wins it. For
  // redeliveries the guard is the previous deliveredAt timestamp.
  const claimed: typeof pending = [];
  for (const command of pending) {
    const { count } = await prisma.command.updateMany({
      data: { deliveredAt: new Date(), status: "delivered" },
      where:
        command.status === "pending"
          ? { id: command.id, status: "pending" }
          : {
              deliveredAt: command.deliveredAt,
              id: command.id,
              status: "delivered",
            },
    });
    if (count === 1) {
      claimed.push(command);
    }
  }

  return claimed.map(
    (command): Command =>
      ({
        id: command.id,
        issuedAt: command.issuedAt.toISOString(),
        payload: command.payload as Record<string, unknown>,
        type: command.type as Command["type"],
      }) as Command
  );
};

export const waitForCommand = async (
  commandId: string,
  timeoutMs = 15_000
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
