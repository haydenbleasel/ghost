import { z } from "zod";
import { COMMAND_STATUSES, LOG_STREAMS, PHASES } from "./constants";

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
  cpuPercent: z.number().min(0).max(100).optional(),
  diskTotalBytes: z.number().int().positive().optional(),
  diskUsedBytes: z.number().int().nonnegative().optional(),
  dockerState: z.enum(["running", "stopped", "missing", "error"]),
  lastCommandId: z.string().nullable().optional(),
  memTotalBytes: z.number().int().positive().optional(),
  memUsedBytes: z.number().int().nonnegative().optional(),
  uptimeSeconds: z.number().int().nonnegative(),
});
export type Heartbeat = z.infer<typeof heartbeatSchema>;

export const activityEventSchema = z.object({
  agentSeq: z.number().int().nonnegative(),
  clientEventId: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime(),
  phase: z.enum(PHASES),
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const logLineSchema = z.object({
  agentSeq: z.number().int().nonnegative(),
  line: z.string(),
  stream: z.enum(LOG_STREAMS),
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
  issuedAt: z.string().datetime(),
  payload: z.object({}).strict(),
  type: z.literal("START"),
});
const stopCommand = z.object({
  id: z.string().min(1),
  issuedAt: z.string().datetime(),
  payload: z.object({}).strict(),
  type: z.literal("STOP"),
});
const restartCommand = z.object({
  id: z.string().min(1),
  issuedAt: z.string().datetime(),
  payload: z.object({ clientIntentId: z.string().min(1) }),
  type: z.literal("RESTART"),
});
const deleteCommand = z.object({
  id: z.string().min(1),
  issuedAt: z.string().datetime(),
  payload: z.object({}).strict(),
  type: z.literal("DELETE"),
});
const updateConfigCommand = z.object({
  id: z.string().min(1),
  issuedAt: z.string().datetime(),
  payload: z.object({
    compose: z.string().min(1),
    env: z.record(z.string(), z.string()).optional(),
  }),
  type: z.literal("UPDATE_CONFIG"),
});
const uploadBackupCommand = z.object({
  id: z.string().min(1),
  issuedAt: z.string().datetime(),
  payload: z.object({ destinationUrl: z.string().url() }),
  type: z.literal("UPLOAD_BACKUP"),
});
const fetchLogsCommand = z.object({
  id: z.string().min(1),
  issuedAt: z.string().datetime(),
  payload: z.object({ tail: z.number().int().positive().optional() }),
  type: z.literal("FETCH_LOGS"),
});

export const commandSchema = z.discriminatedUnion("type", [
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
  durationMs: z.number().int().nonnegative(),
  error: z.string().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(COMMAND_STATUSES),
});
export type CommandAck = z.infer<typeof commandAckSchema>;
