import "server-only";
import type { SnapshotBuildStatus } from "@prisma/client";
import { del as blobDel, put } from "@vercel/blob";
import { FatalError } from "workflow";

import { mintSnapshotDownloadToken } from "@/lib/agent/snapshot-token";
import { prisma } from "@/lib/db";
import { API_URL, env, SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { getProvider } from "@/lib/providers";
import { ProviderApiError } from "@/lib/providers/errors";
import { HETZNER_BUILDER_PROFILE } from "@/lib/providers/hetzner";
import { compileAgentBinary } from "@/lib/sandbox/compile-agent";

import { buildSnapshotCloudInit } from "./build-snapshot-cloud-init";

const SNAPSHOT_DESCRIPTION = `ghost-gold-${SNAPSHOT_ENVIRONMENT.replace(":", "-")}`;
// Covers cloud-init runtime (apt upgrade + Docker install) plus headroom.
// Game images are pulled lazily at per-server provision time.
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
  const params = new URLSearchParams({ t: downloadToken });
  if (env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    params.set(
      "x-vercel-protection-bypass",
      env.VERCEL_AUTOMATION_BYPASS_SECRET
    );
  }
  const agentDownloadUrl = `${API_URL}/api/snapshot/agent-binary?${params.toString()}`;

  return { agentBlobUrl, agentDownloadUrl, agentSha: sha };
};

export const stepCreateBuilderVm = async (input: {
  buildId: string;
  agentDownloadUrl: string;
}): Promise<{ providerBuilderId: string }> => {
  "use step";

  const build = await prisma.snapshotBuild.findUnique({
    select: { providerBuilderId: true },
    where: { id: input.buildId },
  });
  if (!build) {
    throw new FatalError(`SnapshotBuild ${input.buildId} not found`);
  }
  if (build.providerBuilderId) {
    return { providerBuilderId: build.providerBuilderId };
  }

  const provider = getProvider();

  const userData = buildSnapshotCloudInit(input.agentDownloadUrl);
  // Deterministic name: if a retry races a create whose response was lost,
  // the provider's unique-name constraint rejects the duplicate instead of
  // silently billing a second VM.
  const name = `ghost-builder-${input.buildId.toLowerCase().slice(-12)}`;

  let created: Awaited<ReturnType<typeof provider.createServer>>;
  try {
    created = await provider.createServer({
      imageId: HETZNER_BUILDER_PROFILE.baseImage,
      location: HETZNER_BUILDER_PROFILE.location,
      name,
      serverType: HETZNER_BUILDER_PROFILE.serverType,
      userData,
    });
  } catch (error) {
    if (error instanceof ProviderApiError && error.isClientError) {
      throw new FatalError(error.message);
    }
    throw error;
  }

  await prisma.snapshotBuild.update({
    data: { providerBuilderId: created.id, status: "creating_vm" },
    where: { id: input.buildId },
  });

  return { providerBuilderId: created.id };
};

export const stepGetBuilderStatus = async (input: {
  providerBuilderId: string;
}): Promise<{ status: string }> => {
  "use step";
  const server = await getProvider().getServer(input.providerBuilderId);
  return { status: server?.status ?? "unknown" };
};

export const stepCreateSnapshot = async (input: {
  buildId: string;
  providerBuilderId: string;
}): Promise<{ snapshotImageId: string }> => {
  "use step";

  const build = await prisma.snapshotBuild.findUnique({
    select: { snapshotId: true },
    where: { id: input.buildId },
  });
  if (!build) {
    throw new FatalError(`SnapshotBuild ${input.buildId} not found`);
  }
  if (build.snapshotId) {
    return { snapshotImageId: build.snapshotId };
  }

  const provider = getProvider();
  let imageId: string;
  try {
    imageId = await provider.createSnapshot(input.providerBuilderId, {
      description: SNAPSHOT_DESCRIPTION,
    });
  } catch (error) {
    if (error instanceof ProviderApiError && error.isClientError) {
      throw new FatalError(error.message);
    }
    throw error;
  }

  // Persist immediately so a failure later in the workflow can find and
  // delete the image instead of leaking a per-GB-billed snapshot.
  await prisma.snapshotBuild.update({
    data: { snapshotId: imageId },
    where: { id: input.buildId },
  });

  return { snapshotImageId: imageId };
};

export const stepGetImageStatus = async (input: {
  imageId: string;
}): Promise<{ status: string }> => {
  "use step";
  const image = await getProvider().getImage(input.imageId);
  return { status: image?.status ?? "unknown" };
};

export const stepSaveImageId = async (input: {
  buildId: string;
  snapshotImageId: string;
}): Promise<{ previousSnapshotId: string | null }> => {
  "use step";
  const newId = input.snapshotImageId;
  const environment = SNAPSHOT_ENVIRONMENT;
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.snapshot.findUnique({
      select: { providerImageId: true },
      where: { environment },
    });
    const previousSnapshotId = existing?.providerImageId ?? null;
    await tx.snapshot.upsert({
      create: {
        environment,
        id: input.buildId,
        providerImageId: newId,
      },
      update: { providerImageId: newId },
      where: { environment },
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
  providerBuilderId: string;
}): Promise<{ deleted: boolean }> => {
  "use step";
  // Non-fatal: this runs after the snapshot is saved, so a cleanup failure
  // must not flip a "ready" build to "failed". A leftover builder VM is
  // visible in the provider console and cheap to remove manually.
  try {
    return await getProvider().deleteServer(input.providerBuilderId);
  } catch {
    return { deleted: false };
  }
};

export const stepDeletePreviousSnapshot = async (input: {
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
  // Non-fatal: a stranded snapshot is recoverable manually and shouldn't roll
  // back the freshly-saved ID.
  try {
    return await getProvider().deleteImage(input.previousSnapshotId);
  } catch {
    return { deleted: false };
  }
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
  providerBuilderId: string | null;
  agentBlobUrl: string | null;
  snapshotId: string | null;
  status: SnapshotBuildStatus;
} | null> => {
  "use step";
  const build = await prisma.snapshotBuild.findUnique({
    select: {
      agentBlobUrl: true,
      providerBuilderId: true,
      snapshotId: true,
      status: true,
    },
    where: { id: input.buildId },
  });
  if (!build) {
    return null;
  }
  return {
    agentBlobUrl: build.agentBlobUrl,
    providerBuilderId: build.providerBuilderId,
    snapshotId: build.snapshotId,
    status: build.status,
  };
};

export const stepDeleteOrphanImage = async (input: {
  imageId: string;
}): Promise<{ deleted: boolean }> => {
  "use step";
  // Best-effort: this only runs on the failure path, where the original
  // error is what should surface, not a cleanup hiccup.
  try {
    return await getProvider().deleteImage(input.imageId);
  } catch {
    return { deleted: false };
  }
};
