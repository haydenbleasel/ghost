import { FatalError, sleep } from "workflow";

import {
  stepClearVanishedProviderServer,
  stepCreateProviderServerFromSnapshot,
  stepDeleteHibernationSnapshot,
  stepGetServerStatus,
  stepMarkAwake,
  stepMarkFailed,
  stepMarkServerRunning,
  stepReadDesiredState,
  stepSendWakeStartCommand,
  stepWaitAgentReconnected,
} from "./steps";

const MAX_PROVIDER_WAIT_SECONDS = 300;
const PROVIDER_POLL_SECONDS = 6;
const MAX_RECONNECT_WAIT_SECONDS = 300;
const RECONNECT_POLL_SECONDS = 6;

const isCancelled = async (serverId: string): Promise<boolean> =>
  (await stepReadDesiredState(serverId)) !== "running";

export const wakeServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  try {
    if (await isCancelled(serverId)) {
      return;
    }

    const created = await stepCreateProviderServerFromSnapshot(serverId);
    if (created.cancelled || !("providerServerId" in created)) {
      return;
    }
    const { providerServerId } = created;

    const providerDeadline = Date.now() + MAX_PROVIDER_WAIT_SECONDS * 1000;
    let runningIp: string | null = null;
    let booted = false;
    while (Date.now() < providerDeadline) {
      const status = await stepGetServerStatus({ providerServerId, serverId });
      if (status.status === "running") {
        runningIp = status.ip;
        booted = true;
        break;
      }
      if (status.status === "missing") {
        await stepClearVanishedProviderServer(serverId);
        throw new FatalError("Provider server vanished after wake");
      }
      if (await isCancelled(serverId)) {
        return;
      }
      await sleep(`${PROVIDER_POLL_SECONDS}s`);
    }
    if (!booted) {
      await stepMarkFailed({ reason: "Wake boot timeout", serverId });
      return;
    }

    await stepMarkServerRunning({ ipv4: runningIp, serverId });

    const reconnectDeadline = Date.now() + MAX_RECONNECT_WAIT_SECONDS * 1000;
    let reconnected = false;
    while (Date.now() < reconnectDeadline) {
      const result = await stepWaitAgentReconnected(serverId);
      if (result.reconnected) {
        reconnected = true;
        break;
      }
      if (await isCancelled(serverId)) {
        return;
      }
      await sleep(`${RECONNECT_POLL_SECONDS}s`);
    }
    if (!reconnected) {
      await stepMarkFailed({
        reason: "Agent did not reconnect after wake",
        serverId,
      });
      return;
    }

    await stepSendWakeStartCommand(serverId);
    await stepDeleteHibernationSnapshot(serverId);
    await stepMarkAwake(serverId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await stepMarkFailed({ reason, serverId });
    if (error instanceof FatalError) {
      return;
    }
    throw error;
  }
};
