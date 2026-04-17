import { freemem, totalmem } from 'node:os';
import type { State } from './config';
import { probeContainerState } from './docker';
import { signedFetch } from './signing';
import { heartbeatSchema } from '../../protocol';

const HEARTBEAT_MS = 20_000;

export async function runHeartbeat(
  state: State,
  signal: AbortSignal
): Promise<void> {
  const started = Date.now();
  while (!signal.aborted) {
    try {
      const dockerState = await probeContainerState();
      const body = heartbeatSchema.parse({
        uptimeSeconds: Math.floor((Date.now() - started) / 1000),
        dockerState,
        memUsedBytes: totalmem() - freemem(),
        memTotalBytes: totalmem(),
        lastCommandId: state.lastExecutedCommandId,
      });

      await signedFetch({
        method: 'POST',
        url: `${state.apiBaseUrl}/api/agent/heartbeat`,
        agentId: state.agentId,
        privateKey: state.privateKey,
        body,
      });
    } catch (error) {
      console.warn('heartbeat error', error);
    }

    await sleep(HEARTBEAT_MS, signal);
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}
