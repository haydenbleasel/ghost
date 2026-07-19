import { FatalError, sleep } from "workflow";

import {
  stepCreateHibernationSnapshot,
  stepDeleteHibernationSnapshot,
  stepDeleteProviderServer,
  stepDeleteProviderServerForHibernation,
  stepGetSnapshotStatus,
  stepMarkFailed,
  stepReadDesiredState,
  stepReadPhase,
  stepSendStopCommand,
  stepShutdownProviderServer,
} from "./steps";

const MAX_STOP_DRAIN_SECONDS = 60;
const STOP_DRAIN_POLL_SECONDS = 3;
const MAX_SNAPSHOT_WAIT_SECONDS = 1800;
const SNAPSHOT_POLL_SECONDS = 10;

const isCancelled = async (serverId: string): Promise<boolean> =>
  (await stepReadDesiredState(serverId)) !== "hibernated";

export const hibernateServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  try {
    if (await isCancelled(serverId)) {
      return;
    }

    const { hadAgent } = await stepSendStopCommand(serverId);
    if (hadAgent) {
      const deadline = Date.now() + MAX_STOP_DRAIN_SECONDS * 1000;
      while (Date.now() < deadline) {
        const phase = await stepReadPhase(serverId);
        if (phase === "stopped" || phase === "errored") {
          break;
        }
        await sleep(`${STOP_DRAIN_POLL_SECONDS}s`);
      }
    }

    if (await isCancelled(serverId)) {
      return;
    }

    await stepShutdownProviderServer(serverId);
    const { imageId } = await stepCreateHibernationSnapshot(serverId);

    const deadline = Date.now() + MAX_SNAPSHOT_WAIT_SECONDS * 1000;
    let ready = false;
    while (Date.now() < deadline) {
      const { status } = await stepGetSnapshotStatus({ imageId, serverId });
      if (status === "available") {
        ready = true;
        break;
      }
      if (status === "unavailable" || status === "unknown") {
        throw new FatalError(`Snapshot entered ${status} state`);
      }
      await sleep(`${SNAPSHOT_POLL_SECONDS}s`);
    }
    if (!ready) {
      await stepDeleteHibernationSnapshot(serverId);
      await stepDeleteProviderServer(serverId);
      throw new FatalError("Snapshot did not become available in time");
    }

    await stepDeleteProviderServerForHibernation(serverId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await stepMarkFailed({ reason, serverId });
    if (error instanceof FatalError) {
      return;
    }
    throw error;
  }
};
