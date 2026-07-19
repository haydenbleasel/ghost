import { setTimeout as delay } from "node:timers/promises";

import type { Command } from "../../protocol";
import { commandEnvelopeSchema } from "../../protocol";
import type { State } from "./config";
import { saveState } from "./config";
import {
  composeRemove,
  composeRestart,
  composeStop,
  composeUp,
  startLogTail,
  stopLogTail,
  writeCompose,
} from "./docker";
import type { EventBuffer } from "./events";
import { deleteFile, installFromUrl, listFiles } from "./files";
import { signedFetch } from "./signing";

const GAME_CONTAINER = "ghost-game";

const sleep = async (ms: number, signal: AbortSignal): Promise<void> => {
  try {
    await delay(ms, undefined, { signal });
  } catch {
    // aborted
  }
};

const ackCommand = async (
  state: State,
  commandId: string,
  status: "succeeded" | "failed",
  durationMs: number,
  error?: string,
  result?: Record<string, unknown>
): Promise<void> => {
  const res = await signedFetch({
    agentId: state.agentId,
    body: { durationMs, error, result, status },
    method: "POST",
    privateKey: state.privateKey,
    protectionBypass: state.vercelProtectionBypass,
    url: new URL(
      `/api/agent/commands/${commandId}/ack`,
      state.apiBaseUrl
    ).toString(),
  });
  if (!res.ok) {
    console.warn(`ack failed ${res.status}`);
  }
};

export const executeCommand = async (
  state: State,
  command: Command,
  buffer: EventBuffer
): Promise<void> => {
  if (
    state.lastExecutedCommandId === command.id ||
    state.executedCommandIds?.includes(command.id)
  ) {
    console.log(
      `[cmd] ${command.type} ${command.id} already executed; ack-only`
    );
    await ackCommand(state, command.id, "succeeded", 0).catch((error) => {
      console.warn(`ack for ${command.id} failed`, error);
    });
    return;
  }

  console.log(`[cmd] ${command.type} ${command.id} starting`);
  const started = Date.now();
  const startedIso = new Date(started).toISOString();
  let result: Record<string, unknown> | undefined;
  let failure: string | null = null;
  try {
    switch (command.type) {
      case "UPDATE_CONFIG": {
        await writeCompose(command.payload.compose);
        buffer.enqueueActivity({
          message: "Compose written; pulling image",
          phase: "installing",
        });
        await composeUp();
        buffer.enqueueActivity({
          message: "Container started",
          phase: "starting",
        });
        startLogTail(GAME_CONTAINER, buffer, startedIso);
        buffer.enqueueActivity({
          message: "Game is healthy",
          phase: "healthy",
        });
        break;
      }
      case "START": {
        await composeUp();
        startLogTail(GAME_CONTAINER, buffer, startedIso);
        buffer.enqueueActivity({ message: "Starting game", phase: "starting" });
        buffer.enqueueActivity({
          message: "Game is healthy",
          phase: "healthy",
        });
        break;
      }
      case "STOP": {
        await composeStop();
        stopLogTail();
        buffer.enqueueActivity({ message: "Game stopped", phase: "stopped" });
        break;
      }
      case "RESTART": {
        await composeRestart();
        startLogTail(GAME_CONTAINER, buffer, startedIso);
        buffer.enqueueActivity({
          message: "Game restarting",
          phase: "starting",
        });
        break;
      }
      case "DELETE": {
        stopLogTail();
        try {
          await composeRemove();
        } catch {
          // ignore
        }
        buffer.enqueueActivity({
          message: "Draining; host will shut down",
          phase: "deleting",
        });
        await buffer.flush();
        setTimeout(() => {
          Bun.spawn({ cmd: ["shutdown", "-h", "now"] });
        }, 1500).unref();
        break;
      }
      case "FILES_LIST": {
        result = await listFiles(command.payload.path);
        break;
      }
      case "FILES_DELETE": {
        await deleteFile(command.payload.path);
        result = { path: command.payload.path };
        break;
      }
      case "FILES_INSTALL_FROM_URL": {
        const installed = await installFromUrl(command.payload);
        result = { destPath: command.payload.destPath, ...installed };
        break;
      }
      default: {
        // Protocol types the agent doesn't implement (e.g. UPLOAD_BACKUP)
        // must not be acked as succeeded — the operator would get a false
        // "backup taken" / "logs fetched".
        throw new Error(`unsupported command type: ${command.type}`);
      }
    }

    state.lastExecutedCommandId = command.id;
    state.executedCommandIds = [
      ...(state.executedCommandIds ?? []),
      command.id,
    ].slice(-50);
    await saveState(state);
  } catch (error) {
    failure = error instanceof Error ? error.message : "unknown";
  }

  const durationMs = Date.now() - started;
  if (failure === null) {
    console.log(
      `[cmd] ${command.type} ${command.id} succeeded in ${durationMs}ms`
    );
  } else {
    console.error(
      `[cmd] ${command.type} ${command.id} failed after ${durationMs}ms: ${failure}`
    );
    buffer.enqueueActivity({
      message: `Command ${command.type} failed: ${failure}`,
      phase: "errored",
    });
  }

  // The ack is best-effort and must not share the execution try/catch: a
  // transient ack failure would otherwise report a succeeded command as
  // failed and abandon the rest of the envelope in pollCommands.
  try {
    await ackCommand(
      state,
      command.id,
      failure === null ? "succeeded" : "failed",
      durationMs,
      failure ?? undefined,
      result
    );
  } catch (error) {
    console.warn(`ack for ${command.id} failed`, error);
  }
};

export const pollCommands = async (
  state: State,
  buffer: EventBuffer,
  signal: AbortSignal
): Promise<void> => {
  while (!signal.aborted) {
    try {
      const res = await signedFetch({
        agentId: state.agentId,
        method: "GET",
        privateKey: state.privateKey,
        protectionBypass: state.vercelProtectionBypass,
        signal,
        url: new URL(
          "/api/agent/commands?wait=25",
          state.apiBaseUrl
        ).toString(),
      });

      if (res.status === 204) {
        continue;
      }
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
      if (signal.aborted) {
        return;
      }
      console.warn("poll error", error);
      await sleep(5000, signal);
    }
  }
};
