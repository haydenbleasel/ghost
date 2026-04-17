import {
  stepDeleteHetzner,
  stepMarkDeleted,
  stepSendDeleteCommand,
  stepSignalCancelProvision,
} from './steps';
import { createHook, sleep } from 'workflow';
import { hookTokens } from './hook-tokens';
import type { Phase } from '@/protocol';

const MAX_PROVISION_EXIT_SECONDS = 60;
const MAX_DRAIN_SECONDS = 120;

export async function teardownServer(input: { serverId: string }) {
  'use workflow';

  const { serverId } = input;

  // Wake provision out of any wait so it can exit cleanly and release
  // its hooks (including the shared phase token we need below).
  await stepSignalCancelProvision(serverId);

  {
    using provisionDone = createHook<void>({
      token: hookTokens.provisionDone(serverId),
    });
    await Promise.race([
      provisionDone.then(() => 'done' as const),
      sleep(`${MAX_PROVISION_EXIT_SECONDS}s`).then(() => 'timeout' as const),
    ]);
  }

  const { hadAgent } = await stepSendDeleteCommand(serverId);

  if (hadAgent) {
    // Provision has exited by now, so its phase hook is disposed and the
    // token is free for us to claim.
    using drainPhase = createHook<Phase>({
      token: hookTokens.phase(serverId),
    });

    const drainDeadline = Date.now() + MAX_DRAIN_SECONDS * 1000;
    while (Date.now() < drainDeadline) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((drainDeadline - Date.now()) / 1000)
      );
      const event = await Promise.race([
        drainPhase.then((phase) => ({ kind: 'phase' as const, phase })),
        sleep(`${remainingSeconds}s`).then(() => ({
          kind: 'timeout' as const,
        })),
      ]);
      if (event.kind === 'timeout') break;
      if (event.phase === 'deleted' || event.phase === 'errored') break;
    }
  }

  await stepDeleteHetzner(serverId);
  await stepMarkDeleted(serverId);
}
