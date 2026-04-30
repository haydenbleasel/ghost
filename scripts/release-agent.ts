import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";

const REPO_ROOT = process.cwd();
const BINARY_PATH = join(REPO_ROOT, "dist", "ghost-agent");

const parseArgs = () => {
  const args = process.argv.slice(2);
  let serverId: string | undefined;
  let version: string | undefined;
  let skipBuild = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--server" && args[i + 1]) {
      serverId = args[i + 1];
      i += 1;
    } else if (arg === "--version" && args[i + 1]) {
      version = args[i + 1];
      i += 1;
    } else if (arg === "--skip-build") {
      skipBuild = true;
    }
  }
  return { serverId, skipBuild, version };
};

const buildBinary = (): void => {
  console.log(">> building agent binary");
  const result = spawnSync("bun", ["run", "agent:build"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`agent:build failed with status ${result.status}`);
  }
};

const uploadBinary = async (
  version: string,
): Promise<{ url: string; sha256: string; bytes: number }> => {
  const bytes = await readFile(BINARY_PATH);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const pathname = `agent/ghost-agent-${version}-${sha256.slice(0, 12)}`;
  console.log(`>> uploading ${bytes.byteLength} bytes to blob as ${pathname}`);
  const blob = await put(pathname, bytes, {
    access: "public",
    contentType: "application/octet-stream",
  });
  return { bytes: bytes.byteLength, sha256, url: blob.url };
};

const enqueueRollout = async (input: {
  url: string;
  sha256: string;
  version: string;
  serverId?: string;
}) => {
  const servers = await prisma.server.findMany({
    select: { id: true, name: true },
    where: {
      agent: { isNot: null },
      deletedAt: null,
      ...(input.serverId ? { id: input.serverId } : {}),
    },
  });

  if (servers.length === 0) {
    console.log(">> no servers with agents to update");
    return;
  }

  console.log(`>> enqueueing UPDATE_AGENT to ${servers.length} server(s)`);
  for (const server of servers) {
    await enqueueCommand({
      payload: { sha256: input.sha256, url: input.url, version: input.version },
      serverId: server.id,
      type: "UPDATE_AGENT",
    });
    console.log(`   ${server.id}  "${server.name}"`);
  }
};

const main = async () => {
  const { serverId, skipBuild, version: versionArg } = parseArgs();
  const version = versionArg ?? new Date().toISOString().replaceAll(/[:.]/g, "-");

  if (!skipBuild) {
    buildBinary();
  }

  const { url, sha256, bytes } = await uploadBinary(version);
  console.log(`>> released ${version}`);
  console.log(`   url:    ${url}`);
  console.log(`   sha256: ${sha256}`);
  console.log(`   bytes:  ${bytes}`);

  await enqueueRollout({ serverId, sha256, url, version });
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
