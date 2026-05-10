import { sleep } from "workflow";

import {
  stepDeleteProviderServer,
  stepMarkDeleted,
  stepReadPhase,
  stepSendDeleteCommand,
} from "./steps";

const MAX_DRAIN_SECONDS = 120;
const DRAIN_POLL_SECONDS = 3;

export const teardownServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  const { hadAgent } = await stepSendDeleteCommand(serverId);

  if (hadAgent) {
    const deadline = Date.now() + MAX_DRAIN_SECONDS * 1000;
    while (Date.now() < deadline) {
      const phase = await stepReadPhase(serverId);
      if (phase === "deleted" || phase === "errored") {
        break;
      }
      await sleep(`${DRAIN_POLL_SECONDS}s`);
    }
  }

  await stepDeleteProviderServer(serverId);
  await stepMarkDeleted(serverId);
};
