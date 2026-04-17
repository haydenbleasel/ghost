import type { State } from './config';
import { saveState } from './config';
import type { EventBuffer } from './events';
import {
  composeDown,
  composeRemove,
  composeRestart,
  composeStop,
  composeUp,
  probeContainerState,
  startLogTail,
  stopLogTail,
  writeCompose,
} from './docker';
import { signedFetch } from './signing';
import { type Command, commandEnvelopeSchema } from '../../protocol';

const MINECRAFT_CONTAINER = 'ultrabeam-minecraft';

async function ackCommand(
  state: State,
  commandId: string,
  status: 'succeeded' | 'failed',
  durationMs: number,
  error?: string
): Promise<void> {
  const res = await signedFetch({
    method: 'POST',
    url: `${state.apiBaseUrl}/api/agent/commands/${commandId}/ack`,
    agentId: state.agentId,
    privateKey: state.privateKey,
    body: { status, durationMs, error },
  });
  if (!res.ok) console.warn(`ack failed ${res.status}`);
}

export async function executeCommand(
  state: State,
  command: Command,
  buffer: EventBuffer
): Promise<void> {
  if (state.lastExecutedCommandId === command.id) {
    await ackCommand(state, command.id, 'succeeded', 0);
    return;
  }

  const started = Date.now();
  try {
    switch (command.type) {
      case 'UPDATE_CONFIG': {
        await writeCompose(command.payload.compose);
        buffer.enqueueActivity({
          phase: 'installing',
          message: 'Compose written; pulling image',
        });
        await composeUp();
        buffer.enqueueActivity({
          phase: 'starting',
          message: 'Container started',
        });
        startLogTail(MINECRAFT_CONTAINER, buffer);
        buffer.enqueueActivity({ phase: 'healthy', message: 'Game is healthy' });
        break;
      }
      case 'START': {
        await composeUp();
        startLogTail(MINECRAFT_CONTAINER, buffer);
        buffer.enqueueActivity({ phase: 'starting', message: 'Starting game' });
        break;
      }
      case 'STOP': {
        stopLogTail();
        await composeStop();
        buffer.enqueueActivity({ phase: 'stopped', message: 'Game stopped' });
        break;
      }
      case 'RESTART': {
        await composeRestart();
        startLogTail(MINECRAFT_CONTAINER, buffer);
        buffer.enqueueActivity({
          phase: 'starting',
          message: 'Game restarting',
        });
        break;
      }
      case 'DELETE': {
        stopLogTail();
        await composeRemove().catch(() => {});
        buffer.enqueueActivity({
          phase: 'deleting',
          message: 'Draining; host will shut down',
        });
        await buffer.flush();
        setTimeout(() => {
          Bun.spawn({ cmd: ['shutdown', '-h', 'now'] });
        }, 1500).unref();
        break;
      }
      default:
        break;
    }

    state.lastExecutedCommandId = command.id;
    await saveState(state);
    await ackCommand(state, command.id, 'succeeded', Date.now() - started);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    buffer.enqueueActivity({
      phase: 'errored',
      message: `Command ${command.type} failed: ${message}`,
    });
    await ackCommand(
      state,
      command.id,
      'failed',
      Date.now() - started,
      message
    );
  }
}

export async function pollCommands(
  state: State,
  buffer: EventBuffer,
  signal: AbortSignal
): Promise<void> {
  while (!signal.aborted) {
    try {
      const res = await signedFetch({
        method: 'GET',
        url: `${state.apiBaseUrl}/api/agent/commands?wait=25`,
        agentId: state.agentId,
        privateKey: state.privateKey,
        signal,
      });

      if (res.status === 204) continue;
      if (!res.ok) {
        console.warn(`poll got ${res.status}`);
        await sleep(2000, signal);
        continue;
      }

      const envelope = commandEnvelopeSchema.parse(await res.json());
      for (const command of envelope.commands) {
        await executeCommand(state, command, buffer);
      }
    } catch (error) {
      if (signal.aborted) return;
      console.warn('poll error', error);
      await sleep(5000, signal);
    }
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
