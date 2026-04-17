import {
  type Bootstrap,
  type State,
  deleteBootstrap,
  saveState,
} from './config';
import { generateKeypair } from './signing';
import { enrollResponseSchema } from '../../protocol';

export async function enroll(bootstrap: Bootstrap): Promise<State> {
  const keypair = await generateKeypair();

  const response = await fetch(`${bootstrap.apiBaseUrl}/api/agent/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bootstrapToken: bootstrap.bootstrapToken,
      publicKey: keypair.publicKey,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Enrollment failed ${response.status}: ${text}`);
  }

  const parsed = enrollResponseSchema.parse(await response.json());

  const state: State = {
    agentId: parsed.agentId,
    serverId: parsed.serverId,
    apiBaseUrl: bootstrap.apiBaseUrl,
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    agentSeq: 0,
    lastExecutedCommandId: null,
  };

  await saveState(state);
  await deleteBootstrap();

  return state;
}
