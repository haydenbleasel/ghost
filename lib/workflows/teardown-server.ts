import type { Phase } from "@/protocol";
import { createHook, sleep } from "workflow";
import { hookTokens } from "./hook-tokens";
import {
  stepDeleteHetzner,
  stepMarkDeleted,
  stepSendDeleteCommand,
  stepSignalCancelProvision,
} from "./steps";

const MAX_PROVISION_EXIT_SECONDS = 60;
const MAX_DRAIN_SECONDS = 120;

export const teardownServer = async (input: { serverId: string }) => {
  "use workflow";

  const { serverId } = input;

  // Wake provision out of any wait so it can exit cleanly and release
  // its hooks (including the shared phase token we need below).
  await stepSignalCancelProvision(serverId);

  {
    using provisionDone = createHook<undefined>({
      token: hookTokens.provisionDone(serverId),
    });
    const donePromise = (async () => {
      await provisionDone;
      return "done" as const;
    })();
    const timeoutPromise = (async () => {
      await sleep(`${MAX_PROVISION_EXIT_SECONDS}s`);
      return "timeout" as const;
    })();
    await Promise.race([donePromise, timeoutPromise]);
  }

  const { hadAgent } = await stepSendDeleteCommand(serverId);

  if (hadAgent) {
    using drainPhase = createHook<Phase>({
      token: hookTokens.phase(serverId),
    });

    const drainDeadline = Date.now() + MAX_DRAIN_SECONDS * 1000;
    while (Date.now() < drainDeadline) {
      const remainingSeconds = Math.max(1, Math.ceil((drainDeadline - Date.now()) / 1000));
      const phasePromise = (async () => {
        const phase = await drainPhase;
        return { kind: "phase" as const, phase };
      })();
      const timerPromise = (async () => {
        await sleep(`${remainingSeconds}s`);
        return { kind: "timeout" as const };
      })();
      const event = await Promise.race([phasePromise, timerPromise]);
      if (event.kind === "timeout") {
        break;
      }
      if (event.phase === "deleted" || event.phase === "errored") {
        break;
      }
    }
  }

  await stepDeleteHetzner(serverId);
  await stepMarkDeleted(serverId);
};
