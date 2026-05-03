import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, rename, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

const BINARY_PATH =
  process.env.GHOST_AGENT_BINARY ?? "/usr/local/bin/ghost-agent";
const STAGING_DIR = process.env.GHOST_AGENT_STAGING ?? "/var/lib/ghost/update";
const MAX_BINARY_BYTES = 200 * 1024 * 1024;

const ignore = (): undefined => undefined;

export const downloadAndStageAgent = async (input: {
  url: string;
  sha256: string;
}): Promise<{ stagedPath: string; bytes: number }> => {
  await mkdir(STAGING_DIR, { recursive: true });
  const stagedPath = `${STAGING_DIR}/ghost-agent.new`;

  const res = await fetch(input.url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status}`);
  }
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BINARY_BYTES) {
    throw new Error(`binary too large: ${contentLength} > ${MAX_BINARY_BYTES}`);
  }

  const hash = createHash("sha256");
  let bytes = 0;
  const sink = createWriteStream(stagedPath);
  try {
    const source = Readable.fromWeb(res.body as unknown as NodeReadableStream);
    source.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BINARY_BYTES) {
        source.destroy(new Error(`binary exceeds ${MAX_BINARY_BYTES} bytes`));
        return;
      }
      hash.update(chunk);
    });
    await pipeline(source, sink);
  } catch (error) {
    await unlink(stagedPath).catch(ignore);
    throw error;
  }

  const digest = hash.digest("hex").toLowerCase();
  if (digest !== input.sha256.toLowerCase()) {
    await unlink(stagedPath).catch(ignore);
    throw new Error(`sha256 mismatch: expected ${input.sha256}, got ${digest}`);
  }

  await chmod(stagedPath, 0o755);
  return { bytes, stagedPath };
};

export const swapBinaryInPlace = async (stagedPath: string): Promise<void> => {
  await rename(stagedPath, BINARY_PATH);
};

export const agentBinaryPath = BINARY_PATH;
