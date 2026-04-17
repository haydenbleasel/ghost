import { z } from 'zod';
import {
  COMMAND_STATUSES,
  COMMAND_TYPES,
  LOG_STREAMS,
  PHASES,
} from './constants';

export const enrollRequestSchema = z.object({
  bootstrapToken: z.string().min(1),
  publicKey: z.string().min(1),
});
export type EnrollRequest = z.infer<typeof enrollRequestSchema>;

export const enrollResponseSchema = z.object({
  agentId: z.string().min(1),
  serverId: z.string().min(1),
  sessionVersion: z.number().int().nonnegative(),
});
export type EnrollResponse = z.infer<typeof enrollResponseSchema>;

export const rotateKeyRequestSchema = z.object({
  newPublicKey: z.string().min(1),
});
export type RotateKeyRequest = z.infer<typeof rotateKeyRequestSchema>;

export const heartbeatSchema = z.object({
  uptimeSeconds: z.number().int().nonnegative(),
  dockerState: z.enum(['running', 'stopped', 'missing', 'error']),
  cpuPercent: z.number().min(0).max(100).optional(),
  memUsedBytes: z.number().int().nonnegative().optional(),
  memTotalBytes: z.number().int().positive().optional(),
  diskUsedBytes: z.number().int().nonnegative().optional(),
  diskTotalBytes: z.number().int().positive().optional(),
  lastCommandId: z.string().nullable().optional(),
});
export type Heartbeat = z.infer<typeof heartbeatSchema>;

export const activityEventSchema = z.object({
  clientEventId: z.string().min(1),
  agentSeq: z.number().int().nonnegative(),
  phase: z.enum(PHASES),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const logLineSchema = z.object({
  agentSeq: z.number().int().nonnegative(),
  stream: z.enum(LOG_STREAMS),
  line: z.string(),
  ts: z.string().datetime(),
});
export type LogLine = z.infer<typeof logLineSchema>;

export const eventBatchSchema = z.object({
  activity: z.array(activityEventSchema).default([]),
  logs: z.array(logLineSchema).default([]),
});
export type EventBatch = z.infer<typeof eventBatchSchema>;

const startCommand = z.object({
  id: z.string().min(1),
  type: z.literal('START'),
  payload: z.object({}).strict(),
  issuedAt: z.string().datetime(),
});
const stopCommand = z.object({
  id: z.string().min(1),
  type: z.literal('STOP'),
  payload: z.object({}).strict(),
  issuedAt: z.string().datetime(),
});
const restartCommand = z.object({
  id: z.string().min(1),
  type: z.literal('RESTART'),
  payload: z.object({ clientIntentId: z.string().min(1) }),
  issuedAt: z.string().datetime(),
});
const deleteCommand = z.object({
  id: z.string().min(1),
  type: z.literal('DELETE'),
  payload: z.object({}).strict(),
  issuedAt: z.string().datetime(),
});
const updateConfigCommand = z.object({
  id: z.string().min(1),
  type: z.literal('UPDATE_CONFIG'),
  payload: z.object({
    compose: z.string().min(1),
    env: z.record(z.string(), z.string()).optional(),
  }),
  issuedAt: z.string().datetime(),
});
const uploadBackupCommand = z.object({
  id: z.string().min(1),
  type: z.literal('UPLOAD_BACKUP'),
  payload: z.object({ destinationUrl: z.string().url() }),
  issuedAt: z.string().datetime(),
});
const fetchLogsCommand = z.object({
  id: z.string().min(1),
  type: z.literal('FETCH_LOGS'),
  payload: z.object({ tail: z.number().int().positive().optional() }),
  issuedAt: z.string().datetime(),
});

export const commandSchema = z.discriminatedUnion('type', [
  startCommand,
  stopCommand,
  restartCommand,
  deleteCommand,
  updateConfigCommand,
  uploadBackupCommand,
  fetchLogsCommand,
]);
export type Command = z.infer<typeof commandSchema>;

export const commandEnvelopeSchema = z.object({
  commands: z.array(commandSchema),
});
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;

export const commandAckSchema = z.object({
  status: z.enum(COMMAND_STATUSES),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
});
export type CommandAck = z.infer<typeof commandAckSchema>;
