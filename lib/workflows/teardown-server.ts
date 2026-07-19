import { sleep } from "workflow";

import {
  stepDeleteHibernationSnapshot,
  stepDeleteProviderServer,
  stepMarkDeleted,
  stepReadAgentPhase,
  stepSendDeleteCommand,
} from "./steps";

const MAX_DRAIN_SECONDS = 120;
const DRAIN_POLL_SECONDS = 3;

export const teardownServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  const { hadAgent } = await stepSendDeleteCommand(serverId);

  if (hadAgent) {
    // The agent emits a "deleting" activity event once it has drained
    // (compose removed, events flushed) and is about to shut the host down.
    // Server.phase never takes a drain-related value here, so polling it
    // would always burn the full window.
    const deadline = Date.now() + MAX_DRAIN_SECONDS * 1000;
    while (Date.now() < deadline) {
      const agentPhase = await stepReadAgentPhase(serverId);
      if (agentPhase === "deleting") {
        break;
      }
      await sleep(`${DRAIN_POLL_SECONDS}s`);
    }
  }

  await stepDeleteProviderServer(serverId);
  await stepDeleteHibernationSnapshot(serverId);
  await stepMarkDeleted(serverId);
};
