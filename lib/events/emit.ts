import "server-only";
import type { ObservedState as PrismaObservedState } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ulid } from "ulid";

import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { REDIS_KEYS } from "@/protocol";
import type { LogStream, Phase } from "@/protocol";

export interface ActivityPayload {
  serverId: string;
  phase: Phase;
  message: string;
  metadata?: Record<string, unknown>;
  source?: "server" | "agent";
  occurredAt?: Date;
  /**
   * Stable id for idempotent writes. When a retried agent batch re-sends an
   * event that was already recorded, the duplicate insert is dropped.
   */
  dedupeId?: string;
}

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

// Phases the agent emits autonomously (outside the provisioning workflow) that
// represent a steady-state transition the UI needs to reflect on Server.observedState.
// Provisioning phases like "booting"/"installing"/"ready" are owned by lib/workflows/steps.ts.
const PHASE_TO_OBSERVED_STATE: Partial<Record<Phase, PrismaObservedState>> = {
  healthy: "running",
  stopped: "stopped",
};

export const emitActivity = async (input: ActivityPayload): Promise<void> => {
  const seq = Number(await redis.incr(REDIS_KEYS.activitySeq(input.serverId)));
  const occurredAt = input.occurredAt ?? new Date();

  try {
    await prisma.activityEvent.create({
      data: {
        id: input.dedupeId ?? ulid(),
        message: input.message,
        metadata: input.metadata as object | undefined,
        occurredAt,
        phase: input.phase,
        seq,
        serverId: input.serverId,
        source: input.source ?? "server",
      },
    });
  } catch (error) {
    if (input.dedupeId && isUniqueViolation(error)) {
      // Retried batch — the event (and its observedState transition) was
      // already recorded.
      return;
    }
    throw error;
  }

  const nextObservedState = PHASE_TO_OBSERVED_STATE[input.phase];
  if (nextObservedState) {
    await prisma.server.updateMany({
      data: { observedState: nextObservedState },
      where: { deletedAt: null, id: input.serverId },
    });
  }
};

export interface LogPayload {
  serverId: string;
  stream: LogStream;
  line: string;
  ts?: Date;
  /** Stable id for idempotent writes; see {@link ActivityPayload.dedupeId}. */
  dedupeId?: string;
}

export const emitLog = async (input: LogPayload): Promise<void> => {
  const seq = Number(await redis.incr(REDIS_KEYS.logsSeq(input.serverId)));
  const ts = input.ts ?? new Date();

  try {
    await prisma.logChunk.create({
      data: {
        id: input.dedupeId ?? ulid(),
        line: input.line,
        seq,
        serverId: input.serverId,
        stream: input.stream,
        ts,
      },
    });
  } catch (error) {
    if (input.dedupeId && isUniqueViolation(error)) {
      return;
    }
    throw error;
  }
};
