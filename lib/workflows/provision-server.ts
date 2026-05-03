import { createHook, FatalError, sleep } from "workflow";

import type { Phase } from "@/protocol";

import { hookTokens } from "./hook-tokens";
import {
  stepAgentConnected,
  stepCreateHetznerServer,
  stepGetHetznerStatus,
  stepMarkFailed,
  stepMarkHetznerRunning,
  stepMarkReady,
  stepReadDesiredState,
  stepSendInstallConfig,
} from "./steps";

const MAX_HETZNER_WAIT_SECONDS = 300;
const MAX_ENROLL_WAIT_SECONDS = 300;
const MAX_INSTALL_WAIT_SECONDS = 900;

type InstallOutcome = "healthy" | "cancelled" | "errored" | "timeout";

const waitForInstall = (
  phaseHook: AsyncIterable<Phase>,
  cancelled: PromiseLike<"cancelled">
): Promise<InstallOutcome> => {
  const timeout = (async (): Promise<InstallOutcome> => {
    await sleep(`${MAX_INSTALL_WAIT_SECONDS}s`);
    return "timeout";
  })();
  const phases = (async (): Promise<InstallOutcome> => {
    for await (const phase of phaseHook) {
      if (phase === "healthy" || phase === "ready") {
        return "healthy";
      }
      if (phase === "errored") {
        return "errored";
      }
    }
    return "timeout";
  })();
  return Promise.race([phases, cancelled, timeout]);
};

export const provisionServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  using cancelHook = createHook<undefined>({
    token: hookTokens.cancel(serverId),
  });
  using enrollHook = createHook<undefined>({
    token: hookTokens.enrolled(serverId),
  });
  using phaseHook = createHook<Phase>({ token: hookTokens.phase(serverId) });

  const cancelled: Promise<"cancelled"> = (async () => {
    await cancelHook;
    return "cancelled" as const;
  })();

  try {
    if ((await stepReadDesiredState(serverId)) === "deleted") {
      return;
    }

    const createResult = await stepCreateHetznerServer(serverId);
    if (createResult.cancelled) {
      return;
    }
    const { hetznerServerId } = createResult;
    if (hetznerServerId === null) {
      return;
    }

    const hetznerDeadline = Date.now() + MAX_HETZNER_WAIT_SECONDS * 1000;
    let ipv4: string | null = null;
    while (Date.now() < hetznerDeadline) {
      const status = await stepGetHetznerStatus(hetznerServerId);
      if (status.status === "running") {
        ipv4 = status.ip;
        break;
      }
      if (status.status === "unknown") {
        throw new FatalError("Hetzner server not found after create");
      }
      const tickPromise = (async () => {
        await sleep("6s");
        return "tick" as const;
      })();
      const tick = await Promise.race([tickPromise, cancelled]);
      if (tick === "cancelled") {
        return;
      }
    }
    if (!ipv4) {
      await stepMarkFailed({ reason: "Hetzner boot timeout", serverId });
      return;
    }

    await stepMarkHetznerRunning({ ipv4, serverId });

    const enrollPromise = (async () => {
      await enrollHook;
      return "enrolled" as const;
    })();
    const enrollTimeout = (async () => {
      await sleep(`${MAX_ENROLL_WAIT_SECONDS}s`);
      return "timeout" as const;
    })();
    const enrollOutcome = await Promise.race([
      enrollPromise,
      cancelled,
      enrollTimeout,
    ]);
    if (enrollOutcome === "cancelled") {
      return;
    }
    if (enrollOutcome === "timeout") {
      await stepMarkFailed({ reason: "Agent never enrolled", serverId });
      return;
    }

    await stepAgentConnected(serverId);
    await stepSendInstallConfig(serverId);

    const installOutcome = await waitForInstall(phaseHook, cancelled);
    if (installOutcome === "cancelled") {
      return;
    }
    if (installOutcome === "errored") {
      await stepMarkFailed({ reason: "Agent reported error", serverId });
      return;
    }
    if (installOutcome === "timeout") {
      await stepMarkFailed({ reason: "Install timeout", serverId });
      return;
    }

    await stepMarkReady(serverId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await stepMarkFailed({ reason, serverId });
    if (error instanceof FatalError) {
      return;
    }
    throw error;
  }
};
