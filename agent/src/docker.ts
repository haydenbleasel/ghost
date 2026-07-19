import { mkdir, writeFile } from "node:fs/promises";

import { spawn } from "bun";
import type { Subprocess } from "bun";

import type { EventBuffer } from "./events";

const COMPOSE_DIR = process.env.GHOST_COMPOSE_DIR ?? "/var/lib/ghost/game";
const COMPOSE_PATH = `${COMPOSE_DIR}/docker-compose.yml`;

export const GAME_CONTAINER = "ghost-game";

export const writeCompose = async (content: string): Promise<void> => {
  await mkdir(COMPOSE_DIR, { recursive: true });
  await writeFile(COMPOSE_PATH, content, { mode: 0o600 });
};

const runCompose = async (
  args: string[]
): Promise<{ code: number; stderr: string }> => {
  const proc = spawn({
    cmd: ["docker", "compose", "-f", COMPOSE_PATH, ...args],
    stderr: "pipe",
    stdout: "pipe",
  });
  // Drain both pipes while waiting: compose output (e.g. image pull
  // progress) can exceed the OS pipe buffer, and an undrained pipe blocks
  // the child forever.
  const [code, , stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).arrayBuffer(),
    new Response(proc.stderr).text(),
  ]);
  return { code, stderr };
};

const runComposeOrThrow = async (args: string[]): Promise<void> => {
  const { code, stderr } = await runCompose(args);
  if (code !== 0) {
    const detail = stderr.trim().split("\n").at(-1) ?? "";
    throw new Error(
      `docker compose ${args.join(" ")} exited ${code}${detail ? `: ${detail}` : ""}`
    );
  }
};

export const composeUp = (): Promise<void> => runComposeOrThrow(["up", "-d"]);

export const composeDown = (): Promise<void> => runComposeOrThrow(["down"]);

export const composeRestart = (): Promise<void> =>
  runComposeOrThrow(["restart"]);

export const composeStop = (): Promise<void> => runComposeOrThrow(["stop"]);

export const composeRemove = (): Promise<void> =>
  runComposeOrThrow(["down", "-v"]);

export const probeContainerState = async (): Promise<
  "running" | "stopped" | "missing" | "error"
> => {
  const proc = spawn({
    cmd: ["docker", "ps", "--format", "{{.Names}}"],
    stdout: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  if (text.includes("ghost-")) {
    return "running";
  }

  const psa = spawn({
    cmd: ["docker", "ps", "-a", "--format", "{{.Names}}"],
    stdout: "pipe",
  });
  const all = await new Response(psa.stdout).text();
  await psa.exited;
  if (all.includes("ghost-")) {
    return "stopped";
  }
  return "missing";
};

let tailProc: Subprocess | null = null;

const pipeStream = async (
  readable: ReadableStream<Uint8Array> | undefined,
  stream: "stdout" | "stderr",
  buffer: EventBuffer
): Promise<void> => {
  if (!readable) {
    return;
  }
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let tail = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      tail += decoder.decode(value, { stream: true });
      const lines = tail.split("\n");
      tail = lines.pop() ?? "";
      for (const line of lines) {
        if (line.length > 0) {
          buffer.enqueueLog({ line, stream });
        }
      }
    }
  } catch {
    // ignore
  }
};

export const stopLogTail = (): void => {
  if (tailProc) {
    try {
      tailProc.kill();
    } catch {
      // ignore
    }
    tailProc = null;
  }
};

export const startLogTail = (
  containerName: string,
  buffer: EventBuffer,
  since: string
): void => {
  stopLogTail();

  // Tail from an explicit timestamp (the triggering command's start) rather
  // than `--tail 200`: replaying history on every START/RESTART would
  // re-emit old lines under fresh agentSeq values, which the server-side
  // dedupe can't catch.
  tailProc = spawn({
    cmd: ["docker", "logs", "-f", "--since", since, containerName],
    stderr: "pipe",
    stdout: "pipe",
  });

  const { stdout } = tailProc;
  const { stderr } = tailProc;
  if (stdout instanceof ReadableStream) {
    void pipeStream(stdout, "stdout", buffer);
  }
  if (stderr instanceof ReadableStream) {
    void pipeStream(stderr, "stderr", buffer);
  }
};
