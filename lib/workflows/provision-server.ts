import { FatalError, sleep } from "workflow";

import {
  stepAgentConnected,
  stepCreateProviderServer,
  stepGetServerStatus,
  stepMarkFailed,
  stepMarkReady,
  stepMarkServerRunning,
  stepReadAgent,
  stepReadAgentPhase,
  stepReadDesiredState,
  stepSendInstallConfig,
} from "./steps";

const MAX_PROVIDER_WAIT_SECONDS = 300;
const PROVIDER_POLL_SECONDS = 6;
const MAX_ENROLL_WAIT_SECONDS = 300;
const ENROLL_POLL_SECONDS = 6;
const MAX_INSTALL_WAIT_SECONDS = 900;
const INSTALL_POLL_SECONDS = 10;

type PollOutcome<T> =
  | { type: "ready"; value: T }
  | { type: "cancelled" }
  | { type: "timeout" };

const isCancelled = async (serverId: string): Promise<boolean> =>
  (await stepReadDesiredState(serverId)) === "deleted";

const waitForServerRunning = async (input: {
  serverId: string;
  providerServerId: string;
}): Promise<PollOutcome<{ ipv4: string | null }>> => {
  const deadline = Date.now() + MAX_PROVIDER_WAIT_SECONDS * 1000;
  while (Date.now() < deadline) {
    const status = await stepGetServerStatus(input);
    if (status.status === "running") {
      return { type: "ready", value: { ipv4: status.ip } };
    }
    if (status.status === "unknown") {
      throw new FatalError("Provider server not found after create");
    }
    if (await isCancelled(input.serverId)) {
      return { type: "cancelled" };
    }
    await sleep(`${PROVIDER_POLL_SECONDS}s`);
  }
  return { type: "timeout" };
};

const waitForEnrollment = async (
  serverId: string
): Promise<PollOutcome<undefined>> => {
  const deadline = Date.now() + MAX_ENROLL_WAIT_SECONDS * 1000;
  while (Date.now() < deadline) {
    if (await stepReadAgent(serverId)) {
      return { type: "ready", value: undefined };
    }
    if (await isCancelled(serverId)) {
      return { type: "cancelled" };
    }
    await sleep(`${ENROLL_POLL_SECONDS}s`);
  }
  return { type: "timeout" };
};

type InstallOutcome =
  | { type: "healthy" }
  | { type: "errored" }
  | { type: "cancelled" }
  | { type: "timeout" };

const waitForInstall = async (serverId: string): Promise<InstallOutcome> => {
  const deadline = Date.now() + MAX_INSTALL_WAIT_SECONDS * 1000;
  while (Date.now() < deadline) {
    const phase = await stepReadAgentPhase(serverId);
    if (phase === "healthy" || phase === "ready") {
      return { type: "healthy" };
    }
    if (phase === "errored") {
      return { type: "errored" };
    }
    if (await isCancelled(serverId)) {
      return { type: "cancelled" };
    }
    await sleep(`${INSTALL_POLL_SECONDS}s`);
  }
  return { type: "timeout" };
};

export const provisionServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  try {
    if (await isCancelled(serverId)) {
      return;
    }

    const createResult = await stepCreateProviderServer(serverId);
    if (createResult.cancelled || createResult.providerServerId === null) {
      return;
    }
    const { providerServerId } = createResult;

    const providerOutcome = await waitForServerRunning({
      providerServerId,
      serverId,
    });
    if (providerOutcome.type === "cancelled") {
      return;
    }
    if (providerOutcome.type === "timeout") {
      await stepMarkFailed({ reason: "Provider boot timeout", serverId });
      return;
    }

    await stepMarkServerRunning({
      ipv4: providerOutcome.value.ipv4,
      serverId,
    });

    const enrollOutcome = await waitForEnrollment(serverId);
    if (enrollOutcome.type === "cancelled") {
      return;
    }
    if (enrollOutcome.type === "timeout") {
      await stepMarkFailed({ reason: "Agent never enrolled", serverId });
      return;
    }

    await stepAgentConnected(serverId);
    await stepSendInstallConfig(serverId);

    const installOutcome = await waitForInstall(serverId);
    if (installOutcome.type === "cancelled") {
      return;
    }
    if (installOutcome.type === "errored") {
      await stepMarkFailed({ reason: "Agent reported error", serverId });
      return;
    }
    if (installOutcome.type === "timeout") {
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
