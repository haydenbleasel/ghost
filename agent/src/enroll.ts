import { enrollResponseSchema } from "../../protocol";
import {
  deleteBootstrap,
  deleteEnrollKeypair,
  loadEnrollKeypair,
  saveEnrollKeypair,
  saveState,
} from "./config";
import type { Bootstrap, State } from "./config";
import { generateKeypair } from "./signing";

export const enroll = async (bootstrap: Bootstrap): Promise<State> => {
  // Reuse (and persist, before the POST) the keypair across attempts so a
  // lost enroll response is recoverable — the server replies idempotently to
  // a burned token when the public key matches the enrolled agent.
  const keypair = (await loadEnrollKeypair()) ?? (await generateKeypair());
  await saveEnrollKeypair(keypair);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bootstrap.vercelProtectionBypass) {
    headers["x-vercel-protection-bypass"] = bootstrap.vercelProtectionBypass;
  }

  const response = await fetch(
    new URL("/api/agent/enroll", bootstrap.apiBaseUrl),
    {
      body: JSON.stringify({
        bootstrapToken: bootstrap.bootstrapToken,
        publicKey: keypair.publicKey,
      }),
      headers,
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
    vercelProtectionBypass: bootstrap.vercelProtectionBypass,
  };

  await saveState(state);
  await deleteBootstrap();
  await deleteEnrollKeypair();

  return state;
};
