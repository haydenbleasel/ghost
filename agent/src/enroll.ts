import { enrollResponseSchema } from "../../protocol";
import { deleteBootstrap, saveState } from "./config";
import type { Bootstrap, State } from "./config";
import { generateKeypair } from "./signing";

export const enroll = async (bootstrap: Bootstrap): Promise<State> => {
  const keypair = await generateKeypair();

  const response = await fetch(
    new URL("/api/agent/enroll", bootstrap.apiBaseUrl),
    {
      body: JSON.stringify({
        bootstrapToken: bootstrap.bootstrapToken,
        publicKey: keypair.publicKey,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Enrollment failed ${response.status}: ${text}`);
  }

  const parsed = enrollResponseSchema.parse(await response.json());

  const state: State = {
    agentId: parsed.agentId,
    agentSeq: 0,
    apiBaseUrl: bootstrap.apiBaseUrl,
    lastExecutedCommandId: null,
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    serverId: parsed.serverId,
  };

  await saveState(state);
  await deleteBootstrap();

  return state;
};
