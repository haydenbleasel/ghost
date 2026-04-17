import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  AGENT_HEADERS,
  NONCE_TTL_SECONDS,
  REDIS_KEYS,
  TIMESTAMP_SKEW_MS,
  canonicalize,
  fromBase64Url,
} from "@/protocol";
import { verifyAsync } from "@noble/ed25519";

export interface VerifiedAgent {
  agentId: string;
  serverId: string;
  publicKey: string;
}

export class AgentAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AgentAuthError";
    this.status = status;
  }
}

export const verifyAgentRequest = async (
  request: Request,
): Promise<{ verified: VerifiedAgent; body: string }> => {
  const agentId = request.headers.get(AGENT_HEADERS.AGENT);
  const timestamp = request.headers.get(AGENT_HEADERS.TIMESTAMP);
  const nonce = request.headers.get(AGENT_HEADERS.NONCE);
  const signature = request.headers.get(AGENT_HEADERS.SIGNATURE);

  if (!agentId || !timestamp || !nonce || !signature) {
    throw new AgentAuthError("Missing signature headers");
  }

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) {
    throw new AgentAuthError("Invalid timestamp");
  }

  const skew = Math.abs(Date.now() - tsNum);
  if (skew > TIMESTAMP_SKEW_MS) {
    throw new AgentAuthError(`Timestamp skew ${skew}ms exceeds allowed`);
  }

  const nonceKey = REDIS_KEYS.nonce(agentId, nonce);
  const set = await redis.set(nonceKey, "1", {
    ex: NONCE_TTL_SECONDS,
    nx: true,
  });
  if (set === null) {
    throw new AgentAuthError("Nonce already used", 409);
  }

  const agent = await prisma.agent.findUnique({
    select: { id: true, publicKey: true, serverId: true },
    where: { id: agentId },
  });
  if (!agent) {
    throw new AgentAuthError("Unknown agent", 404);
  }

  const url = new URL(request.url);
  const body = await request.text();

  const payload = canonicalize({
    body,
    method: request.method,
    nonce,
    path: url.pathname + url.search,
    timestamp,
  });

  const sigBytes = fromBase64Url(signature);
  const pubBytes = fromBase64Url(agent.publicKey);
  const msgBytes = new TextEncoder().encode(payload);

  const valid = await verifyAsync(sigBytes, msgBytes, pubBytes);
  if (!valid) {
    throw new AgentAuthError("Bad signature");
  }

  return {
    body,
    verified: {
      agentId: agent.id,
      publicKey: agent.publicKey,
      serverId: agent.serverId,
    },
  };
};
