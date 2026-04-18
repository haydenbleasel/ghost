import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import type { FileEntry } from "../../protocol";

const ignore = (): undefined => undefined;

const DATA_ROOT = process.env.GHOST_DATA_ROOT ?? "/var/lib/ghost/game/data";
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;

const resolveInRoot = (relative: string): string => {
  const cleaned = normalize(`/${relative}`).replace(/^\/+/, "");
  const resolved = resolve(DATA_ROOT, cleaned);
  if (resolved !== DATA_ROOT && !resolved.startsWith(DATA_ROOT + sep)) {
    throw new Error("path escapes data root");
  }
  return resolved;
};

export const listFiles = async (
  relativePath: string,
): Promise<{ path: string; entries: FileEntry[] }> => {
  const abs = resolveInRoot(relativePath);
  await mkdir(abs, { recursive: true });
  const dirents = await readdir(abs, { withFileTypes: true });
  const entries: FileEntry[] = [];
  for (const dirent of dirents) {
    try {
      const info = await stat(join(abs, dirent.name));
      entries.push({
        mtime: info.mtime.toISOString(),
        name: dirent.name,
        size: info.isFile() ? info.size : 0,
        type: info.isDirectory() ? "dir" : "file",
      });
    } catch {
      // skip unreadable entries (broken symlinks etc)
    }
  }
  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  const normalized = normalize(`/${relativePath}`).replace(/^\/+/, "");
  return { entries, path: normalized };
};

export const deleteFile = async (relativePath: string): Promise<void> => {
  const abs = resolveInRoot(relativePath);
  if (abs === DATA_ROOT) {
    throw new Error("cannot delete data root");
  }
  const info = await stat(abs);
  await (info.isDirectory() ? rm(abs, { recursive: true }) : unlink(abs));
};

export const installFromUrl = async (input: {
  url: string;
  destPath: string;
  sha256?: string;
}): Promise<{ bytesWritten: number; sha256: string }> => {
  const abs = resolveInRoot(input.destPath);
  if (abs === DATA_ROOT) {
    throw new Error("destPath must be a file");
  }
  await mkdir(dirname(abs), { recursive: true });

  const res = await fetch(input.url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status}`);
  }
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`file too large: ${contentLength} > ${MAX_DOWNLOAD_BYTES}`);
  }

  const hash = createHash("sha256");
  let bytesWritten = 0;
  const tempPath = `${abs}.part`;
  const sink = createWriteStream(tempPath);
  try {
    const source = Readable.fromWeb(res.body as unknown as NodeReadableStream);
    source.on("data", (chunk: Buffer) => {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_DOWNLOAD_BYTES) {
        source.destroy(new Error(`file exceeds ${MAX_DOWNLOAD_BYTES} bytes`));
        return;
      }
      hash.update(chunk);
    });
    await pipeline(source, sink);
  } catch (error) {
    await unlink(tempPath).catch(ignore);
    throw error;
  }

  const digest = hash.digest("hex");
  if (input.sha256 && digest.toLowerCase() !== input.sha256.toLowerCase()) {
    await unlink(tempPath).catch(ignore);
    throw new Error("sha256 mismatch");
  }

  await rm(abs, { force: true });
  await rename(tempPath, abs);
  return { bytesWritten, sha256: digest };
};
