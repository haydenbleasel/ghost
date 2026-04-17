import { writeFile, mkdir } from 'node:fs/promises';
import { spawn, type Subprocess } from 'bun';
import type { EventBuffer } from './events';

const COMPOSE_DIR = process.env.ULTRABEAM_COMPOSE_DIR ?? '/var/lib/ultrabeam/game';
const COMPOSE_PATH = `${COMPOSE_DIR}/docker-compose.yml`;

export async function writeCompose(content: string): Promise<void> {
  await mkdir(COMPOSE_DIR, { recursive: true });
  await writeFile(COMPOSE_PATH, content, { mode: 0o600 });
}

async function runCompose(args: string[]): Promise<number> {
  const proc = spawn({
    cmd: ['docker', 'compose', '-f', COMPOSE_PATH, ...args],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exit = await proc.exited;
  return exit;
}

export async function composeUp(): Promise<void> {
  const code = await runCompose(['up', '-d']);
  if (code !== 0) throw new Error(`docker compose up exited ${code}`);
}

export async function composeDown(): Promise<void> {
  const code = await runCompose(['down']);
  if (code !== 0) throw new Error(`docker compose down exited ${code}`);
}

export async function composeRestart(): Promise<void> {
  const code = await runCompose(['restart']);
  if (code !== 0) throw new Error(`docker compose restart exited ${code}`);
}

export async function composeStop(): Promise<void> {
  const code = await runCompose(['stop']);
  if (code !== 0) throw new Error(`docker compose stop exited ${code}`);
}

export async function composeRemove(): Promise<void> {
  const code = await runCompose(['down', '-v']);
  if (code !== 0) throw new Error(`docker compose down -v exited ${code}`);
}

export async function probeContainerState(): Promise<
  'running' | 'stopped' | 'missing' | 'error'
> {
  const proc = spawn({
    cmd: ['docker', 'ps', '--format', '{{.Names}}'],
    stdout: 'pipe',
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  if (text.includes('ultrabeam-')) return 'running';

  const psa = spawn({
    cmd: ['docker', 'ps', '-a', '--format', '{{.Names}}'],
    stdout: 'pipe',
  });
  const all = await new Response(psa.stdout).text();
  await psa.exited;
  if (all.includes('ultrabeam-')) return 'stopped';
  return 'missing';
}

let tailProc: Subprocess | null = null;

export function startLogTail(
  containerName: string,
  buffer: EventBuffer
): void {
  stopLogTail();

  tailProc = spawn({
    cmd: ['docker', 'logs', '-f', '--tail', '200', containerName],
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = tailProc.stdout;
  const stderr = tailProc.stderr;
  if (stdout instanceof ReadableStream) void pipeStream(stdout, 'stdout', buffer);
  if (stderr instanceof ReadableStream) void pipeStream(stderr, 'stderr', buffer);
}

export function stopLogTail(): void {
  if (tailProc) {
    try {
      tailProc.kill();
    } catch {
      /* noop */
    }
    tailProc = null;
  }
}

async function pipeStream(
  readable: ReadableStream<Uint8Array> | undefined,
  stream: 'stdout' | 'stderr',
  buffer: EventBuffer
): Promise<void> {
  if (!readable) return;
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let tail = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      tail += decoder.decode(value, { stream: true });
      const lines = tail.split('\n');
      tail = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length > 0) buffer.enqueueLog({ stream, line });
      }
    }
  } catch {
    /* ignore */
  }
}
