import {
  stepDeleteHetzner,
  stepMarkDeleted,
  stepSendDeleteCommand,
} from './steps';
import { sleep } from 'workflow';

const MAX_DRAIN_SECONDS = 120;

export async function teardownServer(input: { serverId: string }) {
  'use workflow';

  const { serverId } = input;

  const { hadAgent } = await stepSendDeleteCommand(serverId);

  if (hadAgent) {
    const deadline = Date.now() + MAX_DRAIN_SECONDS * 1000;
    while (Date.now() < deadline) {
      await sleep('10s');
      break;
    }
  }

  await stepDeleteHetzner(serverId);
  await stepMarkDeleted(serverId);
}
