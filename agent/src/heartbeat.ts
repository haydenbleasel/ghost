import { freemem, totalmem } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import type { State } from "./config";
import { probeContainerState } from "./docker";
import { signedFetch } from "./signing";
import { heartbeatSchema } from "../../protocol";

const HEARTBEAT_MS = 20_000;

const sleep = async (ms: number, signal: AbortSignal): Promise<void> => {
  try {
    await delay(ms, undefined, { signal });
  } catch {
    // aborted
  }
};

export const runHeartbeat = async (state: State, signal: AbortSignal): Promise<void> => {
  const started = Date.now();
  while (!signal.aborted) {
    try {
      const dockerState = await probeContainerState();
      const body = heartbeatSchema.parse({
        dockerState,
        lastCommandId: state.lastExecutedCommandId,
        memTotalBytes: totalmem(),
        memUsedBytes: totalmem() - freemem(),
        uptimeSeconds: Math.floor((Date.now() - started) / 1000),
      });

      await signedFetch({
        agentId: state.agentId,
        body,
        method: "POST",
        privateKey: state.privateKey,
        url: `${state.apiBaseUrl}/api/agent/heartbeat`,
      });
    } catch (error) {
      console.warn("heartbeat error", error);
    }

    await sleep(HEARTBEAT_MS, signal);
  }
};
