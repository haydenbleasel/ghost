import 'server-only';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { type LogStream, type Phase, REDIS_KEYS } from '@/protocol';
import { ulid } from 'ulid';

export type ActivityPayload = {
  serverId: string;
  phase: Phase;
  message: string;
  metadata?: Record<string, unknown>;
  source?: 'server' | 'agent';
  occurredAt?: Date;
};

export async function emitActivity(input: ActivityPayload): Promise<void> {
  const seq = Number(await redis.incr(REDIS_KEYS.activitySeq(input.serverId)));
  const occurredAt = input.occurredAt ?? new Date();

  await prisma.activityEvent.create({
    data: {
      id: ulid(),
      serverId: input.serverId,
      seq,
      phase: input.phase,
      message: input.message,
      metadata: input.metadata as object | undefined,
      source: input.source ?? 'server',
      occurredAt,
    },
  });
}

export type LogPayload = {
  serverId: string;
  stream: LogStream;
  line: string;
  ts?: Date;
};

export async function emitLog(input: LogPayload): Promise<void> {
  const seq = Number(await redis.incr(REDIS_KEYS.logsSeq(input.serverId)));
  const ts = input.ts ?? new Date();

  await prisma.logChunk.create({
    data: {
      id: ulid(),
      serverId: input.serverId,
      seq,
      stream: input.stream,
      line: input.line,
      ts,
    },
  });
}
