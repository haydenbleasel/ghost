import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { REDIS_KEYS } from "@/protocol";
import type { LogStream, Phase } from "@/protocol";
import { ulid } from "ulid";

export interface ActivityPayload {
  serverId: string;
  phase: Phase;
  message: string;
  metadata?: Record<string, unknown>;
  source?: "server" | "agent";
  occurredAt?: Date;
}

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
