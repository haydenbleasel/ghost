import "server-only";
import crypto from "node:crypto";

import type { SnapshotBuildStatus } from "@prisma/client";
import { del as blobDel, put } from "@vercel/blob";
import { FatalError } from "workflow";

import { mintSnapshotDownloadToken } from "@/lib/agent/snapshot-token";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  HetznerApiError,
  MissingHetznerCredentialsError,
  throwIfHetznerError,
} from "@/lib/hetzner";
import { getUserHetznerContext } from "@/lib/hetzner/credentials";
import { compileAgentBinary } from "@/lib/sandbox/compile-agent";

import { buildSnapshotCloudInit } from "./build-snapshot-cloud-init";

const BUILDER_LOCATION = "nbg1";
const BUILDER_SERVER_TYPE = "cx23";
const BUILDER_BASE_IMAGE = "ubuntu-24.04";
const SNAPSHOT_DESCRIPTION = "ghost-gold";
// Covers cloud-init runtime (apt upgrade + 6 docker pulls) plus headroom
const AGENT_DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 60;

export const stepUpdateBuildStatus = async (input: {
  buildId: string;
  status: SnapshotBuildStatus;
}) => {
  "use step";
  await prisma.snapshotBuild.update({
    data: { status: input.status },
    where: { id: input.buildId },
  });
};

export const stepCompileAgent = async (input: {
  buildId: string;
}): Promise<{
  agentBlobUrl: string;
  agentDownloadUrl: string;
  agentSha: string;
}> => {
  "use step";

  const build = await prisma.snapshotBuild.findUnique({
    where: { id: input.buildId },
  });
  if (!build) {
    throw new FatalError(`SnapshotBuild ${input.buildId} not found`);
  }

  await prisma.snapshotBuild.update({
    data: { status: "compiling_agent" },
    where: { id: input.buildId },
  });

  const { bytes, sha } = await compileAgentBinary();
  // Per-build pathname so we never reuse a stale (potentially broken) blob from
  // an earlier failed run at the same git commit. The blob is deleted in the
  // workflow's finalizer (`stepDeleteAgentBlob`) once the snapshot is ready.
  const pathname = `agents/ghost-agent-${input.buildId}-${sha.slice(0, 12)}.bin`;
  const uploaded = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60,
    contentType: "application/octet-stream",
  });
  const agentBlobUrl = uploaded.url;

  await prisma.snapshotBuild.update({
    data: { agentBlobUrl, agentSha: sha },
    where: { id: input.buildId },
  });

  const downloadToken = await mintSnapshotDownloadToken({
    buildId: input.buildId,
    ttlSeconds: AGENT_DOWNLOAD_TOKEN_TTL_SECONDS,
  });
  const params = new URLSearchParams({
    t: downloadToken,
    "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
  });
  const agentDownloadUrl = `${env.NEXT_PUBLIC_APP_URL}/api/snapshot/agent-binary?${params.toString()}`;

  return { agentBlobUrl, agentDownloadUrl, agentSha: sha };
};

export const stepCreateBuilderVm = async (input: {
  buildId: string;
  userId: string;
  agentDownloadUrl: string;
}): Promise<{ hetznerBuilderId: number }> => {
  "use step";

  let hetzner: Awaited<ReturnType<typeof getUserHetznerContext>>["client"];
  try {
    ({ client: hetzner } = await getUserHetznerContext(input.userId));
  } catch (error) {
    if (error instanceof MissingHetznerCredentialsError) {
      throw new FatalError("Hetzner credentials missing for user");
    }
    throw error;
  }

  const userData = buildSnapshotCloudInit(input.agentDownloadUrl);
  const name = `ghost-builder-${input.buildId.toLowerCase().slice(-12)}-${crypto
    .randomBytes(2)
    .toString("hex")}`;

  const { data, error, response } = await hetzner.POST("/servers", {
    body: {
      image: BUILDER_BASE_IMAGE,
      location: BUILDER_LOCATION,
      name,
      public_net: { enable_ipv4: true, enable_ipv6: false },
      server_type: BUILDER_SERVER_TYPE,
      start_after_create: true,
      user_data: userData,
    },
  });
  if (!response.ok) {
    const body = error as
      | { error?: { code?: string; message?: string } }
      | undefined;
    const code = body?.error?.code ?? String(response.status);
    const message = body?.error?.message ?? response.statusText;
    const apiError = new HetznerApiError(response.status, code, message);
    if (apiError.isClientError) {
      throw new FatalError(apiError.message);
    }
    throw apiError;
  }
  if (!data?.server) {
    throw new Error("Hetzner server creation returned no server");
  }

  const hetznerBuilderId = data.server.id;
  await prisma.snapshotBuild.update({
    data: { hetznerBuilderId: String(hetznerBuilderId), status: "creating_vm" },
    where: { id: input.buildId },
  });

  return { hetznerBuilderId };
};

export const stepGetBuilderStatus = async (input: {
  userId: string;
  hetznerBuilderId: number;
}): Promise<{ status: string }> => {
  "use step";
  const { client } = await getUserHetznerContext(input.userId);
  const { data, error, response } = await client.GET("/servers/{id}", {
    params: { path: { id: input.hetznerBuilderId } },
  });
  if (response.status === 404) {
    return { status: "unknown" };
  }
  if (!response.ok) {
    throwIfHetznerError(error, response);
  }
  return { status: data?.server?.status ?? "unknown" };
};

export const stepCreateSnapshot = async (input: {
  userId: string;
  hetznerBuilderId: number;
}): Promise<{ snapshotImageId: number }> => {
  "use step";
  const { client } = await getUserHetznerContext(input.userId);
  const { data, error, response } = await client.POST(
    "/servers/{id}/actions/create_image",
    {
      body: { description: SNAPSHOT_DESCRIPTION, type: "snapshot" },
      params: { path: { id: input.hetznerBuilderId } },
    }
  );
  if (!response.ok) {
    const body = error as
      | { error?: { code?: string; message?: string } }
      | undefined;
    const code = body?.error?.code ?? String(response.status);
    const message = body?.error?.message ?? response.statusText;
    const apiError = new HetznerApiError(response.status, code, message);
    if (apiError.isClientError) {
      throw new FatalError(apiError.message);
    }
    throw apiError;
  }
  const imageId = data?.image?.id;
  if (typeof imageId !== "number") {
    throw new TypeError("Hetzner create_image returned no image id");
  }
  return { snapshotImageId: imageId };
};

export const stepGetImageStatus = async (input: {
  userId: string;
  imageId: number;
}): Promise<{ status: string }> => {
  "use step";
  const { client } = await getUserHetznerContext(input.userId);
  const { data, error, response } = await client.GET("/images/{id}", {
    params: { path: { id: input.imageId } },
  });
  if (response.status === 404) {
    return { status: "unknown" };
  }
  if (!response.ok) {
    throwIfHetznerError(error, response);
  }
  return { status: data?.image?.status ?? "unknown" };
};

export const stepSaveImageId = async (input: {
  buildId: string;
  userId: string;
  snapshotImageId: number;
}): Promise<{ previousSnapshotId: string | null }> => {
  "use step";
  const newId = String(input.snapshotImageId);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      select: { hetznerImageId: true },
      where: { id: input.userId },
    });
    const previousSnapshotId = user?.hetznerImageId ?? null;
    await tx.user.update({
      data: { hetznerImageId: newId },
      where: { id: input.userId },
    });
    await tx.snapshotBuild.update({
      data: {
        finishedAt: new Date(),
        previousSnapshotId,
        snapshotId: newId,
        status: "ready",
      },
      where: { id: input.buildId },
    });
    return { previousSnapshotId };
  });
  return result;
};

export const stepDeleteBuilder = async (input: {
  userId: string;
  hetznerBuilderId: number;
}): Promise<{ deleted: boolean }> => {
  "use step";
  let client: Awaited<ReturnType<typeof getUserHetznerContext>>["client"];
  try {
    ({ client } = await getUserHetznerContext(input.userId));
  } catch {
    return { deleted: false };
  }
  const { error, response } = await client.DELETE("/servers/{id}", {
    params: { path: { id: input.hetznerBuilderId } },
  });
  if (!response.ok && response.status !== 404) {
    throwIfHetznerError(error, response);
  }
  return { deleted: true };
};

export const stepDeletePreviousSnapshot = async (input: {
  userId: string;
  previousSnapshotId: string | null;
  newSnapshotId: string;
}): Promise<{ deleted: boolean }> => {
  "use step";
  if (
    !input.previousSnapshotId ||
    input.previousSnapshotId === input.newSnapshotId
  ) {
    return { deleted: false };
  }
  const previousId = Number(input.previousSnapshotId);
  if (!Number.isFinite(previousId)) {
    return { deleted: false };
  }
  let client: Awaited<ReturnType<typeof getUserHetznerContext>>["client"];
  try {
    ({ client } = await getUserHetznerContext(input.userId));
  } catch {
    return { deleted: false };
  }
  const { response } = await client.DELETE("/images/{id}", {
    params: { path: { id: previousId } },
  });
  // Non-fatal: a stranded snapshot is recoverable manually and shouldn't roll
  // back the user's freshly-saved ID.
  return { deleted: response.ok || response.status === 404 };
};

export const stepDeleteAgentBlob = async (input: {
  agentBlobUrl: string | null;
}): Promise<void> => {
  "use step";
  if (!input.agentBlobUrl) {
    return;
  }
  await blobDel(input.agentBlobUrl).catch(() => {
    // best-effort; agent blobs are deduplicated by sha so leftover ones are cheap
  });
};

export const stepMarkFailed = async (input: {
  buildId: string;
  reason: string;
}) => {
  "use step";
  await prisma.snapshotBuild.update({
    data: {
      errorReason: input.reason,
      finishedAt: new Date(),
      status: "failed",
    },
    where: { id: input.buildId },
  });
};

export const stepReadBuildState = async (input: {
  buildId: string;
}): Promise<{
  hetznerBuilderId: number | null;
  agentBlobUrl: string | null;
} | null> => {
  "use step";
  const build = await prisma.snapshotBuild.findUnique({
    select: { agentBlobUrl: true, hetznerBuilderId: true },
    where: { id: input.buildId },
  });
  if (!build) {
    return null;
  }
  return {
    agentBlobUrl: build.agentBlobUrl,
    hetznerBuilderId: build.hetznerBuilderId
      ? Number(build.hetznerBuilderId)
      : null,
  };
};
