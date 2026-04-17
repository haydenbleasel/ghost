export const PHASES = [
  "queued",
  "provisioning",
  "booting",
  "agent_connected",
  "installing",
  "starting",
  "healthy",
  "ready",
  "stopping",
  "stopped",
  "errored",
  "deleting",
  "deleted",
] as const;
export type Phase = (typeof PHASES)[number];

export const DESIRED_STATES = ["running", "stopped", "deleted"] as const;
export type DesiredState = (typeof DESIRED_STATES)[number];

export const OBSERVED_STATES = [
  "pending",
  "provisioning",
  "running",
  "unhealthy",
  "lost",
  "stopped",
  "failed",
  "deleted",
] as const;
export type ObservedState = (typeof OBSERVED_STATES)[number];

export const COMMAND_TYPES = [
  "START",
  "STOP",
  "RESTART",
  "DELETE",
  "UPDATE_CONFIG",
  "UPLOAD_BACKUP",
  "FETCH_LOGS",
] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

export const COMMAND_STATUSES = ["pending", "delivered", "succeeded", "failed"] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];

export const LOG_STREAMS = ["stdout", "stderr"] as const;
export type LogStream = (typeof LOG_STREAMS)[number];

export const AGENT_HEADERS = {
  AGENT: "x-ghost-agent",
  BATCH: "x-ghost-batch-id",
  NONCE: "x-ghost-nonce",
  SIGNATURE: "x-ghost-sig",
  TIMESTAMP: "x-ghost-ts",
} as const;

export const TIMESTAMP_SKEW_MS = 60_000;
export const NONCE_TTL_SECONDS = 300;
export const BOOTSTRAP_TTL_SECONDS = 600;

export const REDIS_KEYS = {
  activityChannel: (serverId: string) => `activity:${serverId}`,
  activitySeq: (serverId: string) => `activity-seq:${serverId}`,
  commandList: (serverId: string) => `cmd:${serverId}`,
  logsChannel: (serverId: string) => `logs:${serverId}`,
  logsSeq: (serverId: string) => `logs-seq:${serverId}`,
  nonce: (agentId: string, nonce: string) => `nonce:${agentId}:${nonce}`,
} as const;
