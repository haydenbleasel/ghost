import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";

import { z } from "zod";

const bootstrapSchema = z.object({
  apiBaseUrl: z.string().url(),
  bootstrapToken: z.string().min(1),
  serverId: z.string().min(1),
  // Set on Vercel preview deployments so callbacks can pass through Vercel's
  // deployment protection. Null on production (no auth wall) and local dev.
  vercelProtectionBypass: z.string().nullable(),
});

const stateSchema = z.object({
  agentId: z.string().min(1),
  agentSeq: z.number().int().nonnegative(),
  apiBaseUrl: z.string().url(),
  // Recently executed command ids: the control plane redelivers commands
  // whose ack was lost, and a single "last id" can't dedupe a redelivery
  // that arrives after a newer command already ran. Optional for
  // backwards-compat with state files written before this field existed.
  executedCommandIds: z.array(z.string()).optional(),
  lastExecutedCommandId: z.string().nullable(),
  privateKey: z.string().min(1),
  publicKey: z.string().min(1),
  serverId: z.string().min(1),
  // Carried forward from bootstrap so the agent keeps punching through preview
  // deployment protection across restarts. Optional for backwards-compat with
  // state files written before this field existed.
  vercelProtectionBypass: z.string().nullable().optional(),
});

export type Bootstrap = z.infer<typeof bootstrapSchema>;
export type State = z.infer<typeof stateSchema>;

const BOOTSTRAP_PATH =
  process.env.GHOST_BOOTSTRAP_PATH ?? "/etc/ghost/bootstrap.json";
const STATE_PATH = process.env.GHOST_STATE_PATH ?? "/var/lib/ghost/state.json";
const STATE_DIR = STATE_PATH.replace(/\/[^/]+$/u, "");

// The enrollment keypair is persisted before the enroll POST is sent: if the
// response is lost (network blip, crash before state.json exists), the retry
// re-sends the same public key and the server can recognise it as a replay of
// an enrollment that already succeeded — a fresh keypair per attempt would
// hit "Token already used" forever.
const ENROLL_KEYPAIR_PATH =
  process.env.GHOST_ENROLL_KEYPAIR_PATH ?? `${STATE_DIR}/enroll-keypair.json`;

const enrollKeypairSchema = z.object({
  privateKey: z.string().min(1),
  publicKey: z.string().min(1),
});

export type EnrollKeypair = z.infer<typeof enrollKeypairSchema>;

export const loadEnrollKeypair = async (): Promise<EnrollKeypair | null> => {
  if (!existsSync(ENROLL_KEYPAIR_PATH)) {
    return null;
  }
  try {
    const raw = await readFile(ENROLL_KEYPAIR_PATH, "utf-8");
    return enrollKeypairSchema.parse(JSON.parse(raw));
  } catch {
    // Corrupted (e.g. crash mid-write before this used atomic swap) —
    // regenerate rather than brick enrollment.
    return null;
  }
};

export const saveEnrollKeypair = async (
  keypair: EnrollKeypair
): Promise<void> => {
  await mkdir(STATE_DIR, { recursive: true });
  const tmp = `${ENROLL_KEYPAIR_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(keypair), { mode: 0o600 });
  await rename(tmp, ENROLL_KEYPAIR_PATH);
};

export const deleteEnrollKeypair = async (): Promise<void> => {
  try {
    await unlink(ENROLL_KEYPAIR_PATH);
  } catch {
    // ignore
  }
};

export const loadBootstrap = async (): Promise<Bootstrap | null> => {
  if (!existsSync(BOOTSTRAP_PATH)) {
    return null;
  }
  const raw = await readFile(BOOTSTRAP_PATH, "utf-8");
  return bootstrapSchema.parse(JSON.parse(raw));
};

export const deleteBootstrap = async (): Promise<void> => {
  try {
    await unlink(BOOTSTRAP_PATH);
  } catch {
    // ignore
  }
};

export const loadState = async (): Promise<State | null> => {
  if (!existsSync(STATE_PATH)) {
    return null;
  }
  const raw = await readFile(STATE_PATH, "utf-8");
  return stateSchema.parse(JSON.parse(raw));
};

// Saves are serialized and each uses its own temp file: the event-buffer
// flush and command execution both call saveState concurrently, and two
// interleaved writers sharing one temp path can rename a partially-written
// file into place.
let saveChain: Promise<void> = Promise.resolve();

export const saveState = (state: State): Promise<void> => {
  // Chain-append must not await here — the caller gets the promise for its
  // own save while later calls queue behind it.
  // oxlint-disable-next-line promise/prefer-await-to-then
  const run = saveChain.then(async () => {
    await mkdir(STATE_DIR, { recursive: true });
    const tmp = `${STATE_PATH}.${crypto.randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
    // Atomic swap: a crash mid-save must never leave a truncated state.json,
    // which would brick the agent on next boot (it refuses to re-enroll while
    // the file exists).
    await rename(tmp, STATE_PATH);
  });
  // oxlint-disable-next-line promise/prefer-await-to-then
  saveChain = run.catch(() => {
    // A failed save must not poison the chain for later saves.
  });
  return run;
};
