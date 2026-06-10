import { FatalError, sleep } from "workflow";

import {
  stepCompileAgent,
  stepCreateBuilderVm,
  stepCreateSnapshot,
  stepDeleteAgentBlob,
  stepDeleteBuilder,
  stepDeleteOrphanImage,
  stepDeletePreviousSnapshot,
  stepGetBuilderStatus,
  stepGetImageStatus,
  stepMarkFailed,
  stepReadBuildState,
  stepSaveImageId,
  stepUpdateBuildStatus,
} from "./build-snapshot-steps";

// 45 min: covers apt upgrade + Docker install on a fresh Ubuntu 24.04 VM,
// with headroom for slow apt mirrors. Game images are pulled lazily at
// per-server provision time, not baked into the snapshot.
const MAX_BUILD_WAIT_SECONDS = 45 * 60;
const BUILD_POLL_SECONDS = 15;
const MAX_SNAPSHOT_WAIT_SECONDS = 15 * 60;
const SNAPSHOT_POLL_SECONDS = 10;

const waitForBuilderOff = async (input: {
  buildId: string;
  userId: string;
  providerBuilderId: string;
}): Promise<void> => {
  const { buildId, userId, providerBuilderId } = input;
  const buildDeadline = Date.now() + MAX_BUILD_WAIT_SECONDS * 1000;
  let observedRunning = false;
  while (Date.now() < buildDeadline) {
    const { status } = await stepGetBuilderStatus({
      providerBuilderId,
      userId,
    });
    if (status === "off") {
      return;
    }
    if (status === "unknown") {
      throw new FatalError("Builder VM disappeared mid-build");
    }
    if (status === "running" && !observedRunning) {
      observedRunning = true;
      await stepUpdateBuildStatus({ buildId, status: "installing" });
    }
    await sleep(`${BUILD_POLL_SECONDS}s`);
  }
  throw new Error("Builder VM never reached 'off' status (build timed out)");
};

const waitForImageAvailable = async (input: {
  userId: string;
  snapshotImageId: string;
}): Promise<void> => {
  const { userId, snapshotImageId } = input;
  const snapshotDeadline = Date.now() + MAX_SNAPSHOT_WAIT_SECONDS * 1000;
  while (Date.now() < snapshotDeadline) {
    const { status } = await stepGetImageStatus({
      imageId: snapshotImageId,
      userId,
    });
    if (status === "available") {
      return;
    }
    if (status === "unavailable" || status === "unknown") {
      throw new Error(`Snapshot image entered status '${status}'`);
    }
    await sleep(`${SNAPSHOT_POLL_SECONDS}s`);
  }
  throw new Error("Snapshot never became available (timed out)");
};

export const buildSnapshot = async (input: {
  buildId: string;
  userId: string;
}) => {
  "use workflow";

  const { buildId, userId } = input;

  try {
    const { agentBlobUrl, agentDownloadUrl } = await stepCompileAgent({
      buildId,
    });

    const { providerBuilderId } = await stepCreateBuilderVm({
      agentDownloadUrl,
      buildId,
      userId,
    });

    await waitForBuilderOff({ buildId, providerBuilderId, userId });

    await stepUpdateBuildStatus({ buildId, status: "snapshotting" });

    const { snapshotImageId } = await stepCreateSnapshot({
      buildId,
      providerBuilderId,
      userId,
    });

    await waitForImageAvailable({ snapshotImageId, userId });

    const { previousSnapshotId } = await stepSaveImageId({
      buildId,
      snapshotImageId,
      userId,
    });

    await stepDeleteBuilder({ providerBuilderId, userId });

    await stepDeletePreviousSnapshot({
      newSnapshotId: snapshotImageId,
      previousSnapshotId,
      userId,
    });

    await stepDeleteAgentBlob({ agentBlobUrl });
  } catch (error) {
    const baseReason = error instanceof Error ? error.message : "Unknown error";
    const state = await stepReadBuildState({ buildId });

    // Leave the builder VM up on failure so the user can SSH in / use the
    // provider's web console to read cloud-init logs. Surface the VM id in
    // the error reason so they know what to delete once they're done.
    const reason = state?.providerBuilderId
      ? `${baseReason} (builder VM left for inspection — id: ${state.providerBuilderId})`
      : baseReason;

    await stepMarkFailed({ buildId, reason });

    // A snapshot image created by this build that never reached "ready" is
    // referenced nowhere — delete it so it doesn't bill forever.
    if (state?.snapshotId && state.status !== "ready") {
      await stepDeleteOrphanImage({ imageId: state.snapshotId, userId });
    }

    if (state?.agentBlobUrl) {
      await stepDeleteAgentBlob({ agentBlobUrl: state.agentBlobUrl });
    }

    if (error instanceof FatalError) {
      return;
    }
    throw error;
  }
};
