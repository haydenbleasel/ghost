import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";

import { z } from "zod";

const bootstrapSchema = z.object({
  apiBaseUrl: z.string().url(),
  bootstrapToken: z.string().min(1),
  serverId: z.string().min(1),
});

const stateSchema = z.object({
  agentId: z.string().min(1),
  agentSeq: z.number().int().nonnegative(),
  apiBaseUrl: z.string().url(),
  lastExecutedCommandId: z.string().nullable(),
  privateKey: z.string().min(1),
  publicKey: z.string().min(1),
  serverId: z.string().min(1),
});

export type Bootstrap = z.infer<typeof bootstrapSchema>;
export type State = z.infer<typeof stateSchema>;

const BOOTSTRAP_PATH =
  process.env.GHOST_BOOTSTRAP_PATH ?? "/etc/ghost/bootstrap.json";
const STATE_PATH = process.env.GHOST_STATE_PATH ?? "/var/lib/ghost/state.json";
const STATE_DIR = STATE_PATH.replace(/\/[^/]+$/, "");

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

export const saveState = async (state: State): Promise<void> => {
  await mkdir(STATE_DIR, { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await Bun.write(STATE_PATH, await Bun.file(tmp).arrayBuffer());
  try {
    await unlink(tmp);
  } catch {
    // ignore
  }
};
