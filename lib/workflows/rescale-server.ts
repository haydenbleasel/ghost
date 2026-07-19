import { FatalError, sleep } from "workflow";

import {
  stepChangeServerType,
  stepGetServerStatus,
  stepMarkRescaled,
  stepMarkRescaleFailed,
  stepPoweroffProviderServer,
  stepPoweronProviderServer,
  stepShutdownProviderServer,
} from "./steps";

const MAX_SHUTDOWN_WAIT_SECONDS = 120;
const MAX_POWEROFF_WAIT_SECONDS = 60;
const POWER_POLL_SECONDS = 5;

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
      throw new FatalError("Provider VM vanished during rescale");
    }
    await sleep(`${POWER_POLL_SECONDS}s`);
  }
  return false;
};

// Hetzner's change_type requires the VM itself to be powered off — a
// "stopped" Ghost server only has its game container stopped, the VM is
// still running. Power-cycle around the type change: graceful ACPI shutdown
// first, hard poweroff as a fallback, then boot the VM back up.
export const rescaleServer = async (input: {
  serverId: string;
  serverType: string;
}) => {
  "use workflow";

  const { serverId, serverType } = input;

  try {
    const shutdown = await stepShutdownProviderServer(serverId);
    if (!shutdown.ok) {
      throw new FatalError("Server has no provider VM to rescale");
    }

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
      throw new FatalError("VM did not power off for rescale");
    }

    await stepChangeServerType({ serverId, serverType });
    await stepPoweronProviderServer(serverId);
    await stepMarkRescaled({ serverId, serverType });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await stepMarkRescaleFailed({ reason, serverId });
    if (error instanceof FatalError) {
      return;
    }
    throw error;
  }
};
