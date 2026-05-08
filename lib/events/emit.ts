import "server-only";
import type { ObservedState as PrismaObservedState } from "@prisma/client";
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
}

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

  await prisma.activityEvent.create({
    data: {
      id: ulid(),
      message: input.message,
      metadata: input.metadata as object | undefined,
      occurredAt,
      phase: input.phase,
      seq,
      serverId: input.serverId,
      source: input.source ?? "server",
    },
  });

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
}

export const emitLog = async (input: LogPayload): Promise<void> => {
  const seq = Number(await redis.incr(REDIS_KEYS.logsSeq(input.serverId)));
  const ts = input.ts ?? new Date();

  await prisma.logChunk.create({
    data: {
      id: ulid(),
      line: input.line,
      seq,
      serverId: input.serverId,
      stream: input.stream,
      ts,
    },
  });
};
