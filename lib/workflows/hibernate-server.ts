import { FatalError, sleep } from "workflow";

import {
  stepCreateHibernationSnapshot,
  stepDeleteHibernationSnapshot,
  stepDeleteProviderServerForHibernation,
  stepGetServerStatus,
  stepGetSnapshotStatus,
  stepMarkFailed,
  stepMarkHibernating,
  stepPoweroffProviderServer,
  stepReadDesiredState,
  stepReadObservedState,
  stepSendStopCommand,
  stepShutdownProviderServer,
} from "./steps";

const MAX_STOP_DRAIN_SECONDS = 60;
const STOP_DRAIN_POLL_SECONDS = 3;
const MAX_SHUTDOWN_WAIT_SECONDS = 120;
const MAX_POWEROFF_WAIT_SECONDS = 60;
const POWER_POLL_SECONDS = 5;
const MAX_SNAPSHOT_WAIT_SECONDS = 1800;
const SNAPSHOT_POLL_SECONDS = 10;

const isCancelled = async (serverId: string): Promise<boolean> =>
  (await stepReadDesiredState(serverId)) !== "hibernated";

const waitForPowerOff = async (
  serverId: string,
  providerServerId: string,
  maxSeconds: number
): Promise<boolean> => {
  const deadline = Date.now() + maxSeconds * 1000;
  while (Date.now() < deadline) {
    const { status } = await stepGetServerStatus({
      providerServerId,
      serverId,
    });
    if (status === "off") {
      return true;
    }
    if (status === "missing") {
      throw new FatalError("Provider VM vanished before snapshot");
    }
    await sleep(`${POWER_POLL_SECONDS}s`);
  }
  return false;
};

export const hibernateServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  try {
    if (await isCancelled(serverId)) {
      return;
    }

    const { hadAgent } = await stepSendStopCommand(serverId);
    if (hadAgent) {
      // When the agent finishes the STOP (world saved, container stopped)
      // it reports a "stopped" event, which lands on Server.observedState.
      // Server.phase never becomes "stopped", so polling it would always
      // burn the full window — and risk shutting down mid-save.
      const deadline = Date.now() + MAX_STOP_DRAIN_SECONDS * 1000;
      while (Date.now() < deadline) {
        const observed = await stepReadObservedState(serverId);
        if (observed === "stopped" || observed === "failed") {
          break;
        }
        await sleep(`${STOP_DRAIN_POLL_SECONDS}s`);
      }
    }

    if (await isCancelled(serverId)) {
      return;
    }

    await stepMarkHibernating(serverId);

    const shutdown = await stepShutdownProviderServer(serverId);
    if (!shutdown.ok) {
      throw new FatalError("Server has no provider VM to hibernate");
    }

    // Snapshotting a running disk risks a corrupt world save: wait for the
    // graceful shutdown to land, escalating to a hard poweroff if the guest
    // ignores ACPI.
    let off = await waitForPowerOff(
      serverId,
      shutdown.providerServerId,
      MAX_SHUTDOWN_WAIT_SECONDS
    );
    if (!off) {
      await stepPoweroffProviderServer(serverId);
      off = await waitForPowerOff(
        serverId,
        shutdown.providerServerId,
        MAX_POWEROFF_WAIT_SECONDS
      );
    }
    if (!off) {
      throw new FatalError("VM did not power off before snapshot");
    }

    const { imageId } = await stepCreateHibernationSnapshot(serverId);

    const deadline = Date.now() + MAX_SNAPSHOT_WAIT_SECONDS * 1000;
    let ready = false;
    while (Date.now() < deadline) {
      const { status } = await stepGetSnapshotStatus({ imageId, serverId });
      if (status === "available") {
        ready = true;
        break;
      }
      if (status === "unavailable" || status === "missing") {
        // The snapshot is junk (or was deleted out from under us): clear it
        // so a retry starts a fresh one. The VM stays untouched — it still
        // holds the only copy of the data.
        await stepDeleteHibernationSnapshot(serverId);
        throw new FatalError(`Snapshot entered ${status} state`);
      }
      await sleep(`${SNAPSHOT_POLL_SECONDS}s`);
    }
    if (!ready) {
      // Never tear anything down on a timeout: the snapshot may yet complete
      // and a retry will reuse it via the stored image id.
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
