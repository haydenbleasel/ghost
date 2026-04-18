import { sleep } from "workflow";
import {
  stepDeleteHetzner,
  stepMarkDeleted,
  stepReadPhase,
  stepSendDeleteCommand,
  stepSignalCancelProvision,
} from "./steps";

const MAX_DRAIN_SECONDS = 120;
const DRAIN_POLL_SECONDS = 3;

export const teardownServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  await stepSignalCancelProvision(serverId);

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

  await stepDeleteHetzner(serverId);
  await stepMarkDeleted(serverId);
};
