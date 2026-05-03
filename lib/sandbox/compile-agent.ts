import "server-only";
import crypto from "node:crypto";

import { Sandbox } from "@vercel/sandbox";

const BUN_INSTALL = "curl -fsSL https://bun.sh/install | bash";
// Root install is required because agent/src/*.ts imports from ../../protocol,
// which lives at the repo root and pulls in zod from the root node_modules.
const BUILD_SCRIPT = [
  'export PATH="$HOME/.bun/bin:$PATH"',
  "bun install --production --ignore-scripts",
  "cd agent",
  "bun install --production --ignore-scripts",
  "bun build --compile --target=bun-linux-x64 ./src/index.ts --outfile ../dist/ghost-agent",
].join(" && ");

interface GitSource {
  url: string;
  revision: string;
  username?: string;
  password?: string;
}

const resolveGitSource = (): GitSource => {
  const explicitUrl = process.env.GHOST_GIT_REPO_URL;
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GHOST_GIT_REVISION;

  if (!sha) {
    throw new Error(
      "No git revision available. Set VERCEL_GIT_COMMIT_SHA (Vercel injects this) or GHOST_GIT_REVISION for local dev."
    );
  }

  const url =
    explicitUrl ??
    (owner && slug ? `https://github.com/${owner}/${slug}` : null);
  if (!url) {
    throw new Error(
      "No git URL available. Set GHOST_GIT_REPO_URL or rely on VERCEL_GIT_REPO_OWNER/SLUG."
    );
  }

  const token = process.env.VERCEL_SANDBOX_GIT_TOKEN;
  if (token) {
    return { password: token, revision: sha, url, username: "x-access-token" };
  }
  return { revision: sha, url };
};

const sha256 = (buf: Buffer): string =>
  crypto.createHash("sha256").update(buf).digest("hex");

export const compileAgentBinary = async (): Promise<{
  bytes: Buffer;
  sha: string;
}> => {
  const git = resolveGitSource();

  const sandbox = await Sandbox.create({
    resources: { vcpus: 4 },
    runtime: "node22",
    source: {
      revision: git.revision,
      type: "git",
      url: git.url,
      ...(git.username && git.password
        ? { password: git.password, username: git.username }
        : {}),
    },
    timeout: 10 * 60 * 1000,
  });

  try {
    const installBun = await sandbox.runCommand({
      args: ["-c", BUN_INSTALL],
      cmd: "bash",
    });
    if (installBun.exitCode !== 0) {
      throw new Error(
        `bun install script failed (exit ${installBun.exitCode}): ${await installBun.stderr()}`
      );
    }

    const build = await sandbox.runCommand({
      args: ["-c", BUILD_SCRIPT],
      cmd: "bash",
    });
    if (build.exitCode !== 0) {
      const combined = await build.output("both");
      throw new Error(
        `agent build failed (exit ${build.exitCode}): ${combined.slice(-2000)}`
      );
    }

    const bytes = await sandbox.readFileToBuffer({ path: "dist/ghost-agent" });
    if (!bytes) {
      throw new Error("agent build produced no dist/ghost-agent file");
    }

    return { bytes, sha: sha256(bytes) };
  } finally {
    await sandbox.stop().catch(() => {
      // sandbox auto-terminates on timeout; best-effort stop
    });
  }
};
