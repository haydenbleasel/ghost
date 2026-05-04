import { FatalError, sleep } from "workflow";

import {
  stepCompileAgent,
  stepCreateBuilderVm,
  stepCreateSnapshot,
  stepDeleteAgentBlob,
  stepDeleteBuilder,
  stepDeletePreviousSnapshot,
  stepGetBuilderStatus,
  stepGetImageStatus,
  stepMarkFailed,
  stepReadBuildState,
  stepSaveImageId,
  stepUpdateBuildStatus,
} from "./build-snapshot-steps";

// 45 min: covers apt upgrade + 6 docker pulls on a fresh Ubuntu 24.04 VM,
// with headroom for slow apt mirrors / docker hub pulls.
const MAX_BUILD_WAIT_SECONDS = 45 * 60;
const BUILD_POLL_SECONDS = 15;
const MAX_SNAPSHOT_WAIT_SECONDS = 15 * 60;
const SNAPSHOT_POLL_SECONDS = 10;

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

    const { hetznerBuilderId } = await stepCreateBuilderVm({
      agentDownloadUrl,
      buildId,
      userId,
    });

    const buildDeadline = Date.now() + MAX_BUILD_WAIT_SECONDS * 1000;
    let observedRunning = false;
    let buildFinished = false;
    while (Date.now() < buildDeadline) {
      const { status } = await stepGetBuilderStatus({
        hetznerBuilderId,
        userId,
      });
      if (status === "off") {
        buildFinished = true;
        break;
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
    if (!buildFinished) {
      throw new Error(
        "Builder VM never reached 'off' status (build timed out)"
      );
    }

    await stepUpdateBuildStatus({ buildId, status: "snapshotting" });

    const { snapshotImageId } = await stepCreateSnapshot({
      hetznerBuilderId,
      userId,
    });

    const snapshotDeadline = Date.now() + MAX_SNAPSHOT_WAIT_SECONDS * 1000;
    let snapshotReady = false;
    while (Date.now() < snapshotDeadline) {
      const { status } = await stepGetImageStatus({
        imageId: snapshotImageId,
        userId,
      });
      if (status === "available") {
        snapshotReady = true;
        break;
      }
      if (status === "unavailable" || status === "unknown") {
        throw new Error(`Snapshot image entered status '${status}'`);
      }
      await sleep(`${SNAPSHOT_POLL_SECONDS}s`);
    }
    if (!snapshotReady) {
      throw new Error("Snapshot never became available (timed out)");
    }

    const { previousSnapshotId } = await stepSaveImageId({
      buildId,
      snapshotImageId,
      userId,
    });

    await stepDeleteBuilder({ hetznerBuilderId, userId });

    await stepDeletePreviousSnapshot({
      newSnapshotId: String(snapshotImageId),
      previousSnapshotId,
      userId,
    });

    await stepDeleteAgentBlob({ agentBlobUrl });
  } catch (error) {
    const baseReason = error instanceof Error ? error.message : "Unknown error";
    const state = await stepReadBuildState({ buildId });

    // Leave the builder VM up on failure so the user can SSH in / use the
    // Hetzner web console to read cloud-init logs. Surface the VM id in the
    // error reason so they know what to delete once they're done debugging.
    const reason = state?.hetznerBuilderId
      ? `${baseReason} (builder VM left for inspection — delete with \`hcloud server delete ${state.hetznerBuilderId}\`)`
      : baseReason;

    await stepMarkFailed({ buildId, reason });

    if (state?.agentBlobUrl) {
      await stepDeleteAgentBlob({ agentBlobUrl: state.agentBlobUrl });
    }

    if (error instanceof FatalError) {
      return;
    }
    throw error;
  }
};
