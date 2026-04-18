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
import { downloadAndStageAgent, swapBinaryInPlace } from "./update";

const MINECRAFT_CONTAINER = "ghost-minecraft";

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
  result?: Record<string, unknown>,
): Promise<void> => {
  const res = await signedFetch({
    agentId: state.agentId,
    body: { durationMs, error, result, status },
    method: "POST",
    privateKey: state.privateKey,
    url: `${state.apiBaseUrl}/api/agent/commands/${commandId}/ack`,
  });
  if (!res.ok) {
    console.warn(`ack failed ${res.status}`);
  }
};

export const executeCommand = async (
  state: State,
  command: Command,
  buffer: EventBuffer,
): Promise<void> => {
  if (state.lastExecutedCommandId === command.id) {
    await ackCommand(state, command.id, "succeeded", 0);
    return;
  }

  const started = Date.now();
  let result: Record<string, unknown> | undefined;
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
        startLogTail(MINECRAFT_CONTAINER, buffer);
        buffer.enqueueActivity({ message: "Game is healthy", phase: "healthy" });
        break;
      }
      case "START": {
        await composeUp();
        startLogTail(MINECRAFT_CONTAINER, buffer);
        buffer.enqueueActivity({ message: "Starting game", phase: "starting" });
        break;
      }
      case "STOP": {
        stopLogTail();
        await composeStop();
        buffer.enqueueActivity({ message: "Game stopped", phase: "stopped" });
        break;
      }
      case "RESTART": {
        await composeRestart();
        startLogTail(MINECRAFT_CONTAINER, buffer);
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
      case "UPDATE_AGENT": {
        buffer.enqueueActivity({
          message: `Staging new agent${
            command.payload.version ? ` ${command.payload.version}` : ""
          }`,
          phase: "installing",
        });
        const { stagedPath, bytes } = await downloadAndStageAgent(command.payload);
        await swapBinaryInPlace(stagedPath);
        result = { bytes, version: command.payload.version };
        state.lastExecutedCommandId = command.id;
        await saveState(state);
        buffer.enqueueActivity({
          message: "Restarting to new agent",
          phase: "installing",
        });
        await buffer.flush();
        await ackCommand(state, command.id, "succeeded", Date.now() - started, undefined, result);
        setTimeout(() => process.exit(0), 500).unref();
        return;
      }
      default: {
        break;
      }
    }

    state.lastExecutedCommandId = command.id;
    await saveState(state);
    await ackCommand(state, command.id, "succeeded", Date.now() - started, undefined, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    buffer.enqueueActivity({
      message: `Command ${command.type} failed: ${message}`,
      phase: "errored",
    });
    await ackCommand(state, command.id, "failed", Date.now() - started, message);
  }
};

export const pollCommands = async (
  state: State,
  buffer: EventBuffer,
  signal: AbortSignal,
): Promise<void> => {
  while (!signal.aborted) {
    try {
      const res = await signedFetch({
        agentId: state.agentId,
        method: "GET",
        privateKey: state.privateKey,
        signal,
        url: `${state.apiBaseUrl}/api/agent/commands?wait=25`,
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
