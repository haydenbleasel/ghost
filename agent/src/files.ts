import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import {
  mkdir,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  unlink,
} from "node:fs/promises";
import nodePath from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import type { FileEntry } from "../../protocol";

const ignore = (): undefined => undefined;

const DATA_ROOT = process.env.GHOST_DATA_ROOT ?? "/var/lib/ghost/game/data";
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;

let cachedRealRoot: string | null = null;
const realDataRoot = async (): Promise<string> => {
  if (!cachedRealRoot) {
    await mkdir(DATA_ROOT, { recursive: true });
    cachedRealRoot = await realpath(DATA_ROOT);
  }
  return cachedRealRoot;
};

// Resolve symlinks in the deepest existing ancestor of `target`, then
// re-append the not-yet-existing tail (which cannot contain symlinks).
const realpathDeepestAncestor = async (target: string): Promise<string> => {
  let existing = target;
  let tail = "";
  for (;;) {
    let real: string | null = null;
    try {
      real = await realpath(existing);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    if (real !== null) {
      return tail ? nodePath.join(real, tail) : real;
    }
    const parent = nodePath.dirname(existing);
    if (parent === existing) {
      throw new Error("unable to resolve path");
    }
    tail = tail
      ? nodePath.join(nodePath.basename(existing), tail)
      : nodePath.basename(existing);
    existing = parent;
  }
};

const assertWithinRoot = (path: string, root: string): void => {
  if (path !== root && !path.startsWith(root + nodePath.sep)) {
    throw new Error("path escapes data root");
  }
};

const resolveInRoot = async (relative: string): Promise<string> => {
  const root = await realDataRoot();
  const cleaned = nodePath.normalize(`/${relative}`).replace(/^\/+/u, "");
  const resolved = nodePath.resolve(root, cleaned);
  assertWithinRoot(resolved, root);
  // The untrusted game container can plant symlinks inside the bind-mounted
  // data root; resolve them and re-check so writes/deletes can't be
  // redirected outside the root.
  const real = await realpathDeepestAncestor(resolved);
  assertWithinRoot(real, root);
  return real;
};

export const listFiles = async (
  relativePath: string
): Promise<{ path: string; entries: FileEntry[] }> => {
  const abs = await resolveInRoot(relativePath);
  await mkdir(abs, { recursive: true });
  const dirents = await readdir(abs, { withFileTypes: true });
  const entries: FileEntry[] = [];
  for (const dirent of dirents) {
    try {
      const info = await stat(nodePath.join(abs, dirent.name));
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
  const normalized = nodePath
    .normalize(`/${relativePath}`)
    .replace(/^\/+/u, "");
  return { entries, path: normalized };
};

export const deleteFile = async (relativePath: string): Promise<void> => {
  const abs = await resolveInRoot(relativePath);
  if (abs === (await realDataRoot())) {
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
  const abs = await resolveInRoot(input.destPath);
  if (abs === (await realDataRoot())) {
    throw new Error("destPath must be a file");
  }
  await mkdir(nodePath.dirname(abs), { recursive: true });

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

  try {
    // `force` doesn't cover directories: replacing an existing dir throws
    // here, and the temp download must not be left behind when it does.
    await rm(abs, { force: true });
    await rename(tempPath, abs);
  } catch (error) {
    await unlink(tempPath).catch(ignore);
    throw error;
  }
  return { bytesWritten, sha256: digest };
};
