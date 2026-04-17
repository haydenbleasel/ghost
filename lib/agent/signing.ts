import 'server-only';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import {
  AGENT_HEADERS,
  NONCE_TTL_SECONDS,
  REDIS_KEYS,
  TIMESTAMP_SKEW_MS,
  canonicalize,
  fromBase64Url,
} from '@/protocol';
import { verifyAsync } from '@noble/ed25519';

export type VerifiedAgent = {
  agentId: string;
  serverId: string;
  publicKey: string;
};

export class AgentAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function verifyAgentRequest(
  request: Request
): Promise<{ verified: VerifiedAgent; body: string }> {
  const agentId = request.headers.get(AGENT_HEADERS.AGENT);
  const timestamp = request.headers.get(AGENT_HEADERS.TIMESTAMP);
  const nonce = request.headers.get(AGENT_HEADERS.NONCE);
  const signature = request.headers.get(AGENT_HEADERS.SIGNATURE);

  if (!agentId || !timestamp || !nonce || !signature) {
    throw new AgentAuthError('Missing signature headers');
  }

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) {
    throw new AgentAuthError('Invalid timestamp');
  }

  const skew = Math.abs(Date.now() - tsNum);
  if (skew > TIMESTAMP_SKEW_MS) {
    throw new AgentAuthError(`Timestamp skew ${skew}ms exceeds allowed`);
  }

  const nonceKey = REDIS_KEYS.nonce(agentId, nonce);
  const set = await redis.set(nonceKey, '1', {
    ex: NONCE_TTL_SECONDS,
    nx: true,
  });
  if (set === null) {
    throw new AgentAuthError('Nonce already used', 409);
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, serverId: true, publicKey: true },
  });
  if (!agent) {
    throw new AgentAuthError('Unknown agent', 404);
  }

  const url = new URL(request.url);
  const body = await request.text();

  const payload = canonicalize({
    method: request.method,
    path: url.pathname + url.search,
    timestamp,
    nonce,
    body,
  });

  const sigBytes = fromBase64Url(signature);
  const pubBytes = fromBase64Url(agent.publicKey);
  const msgBytes = new TextEncoder().encode(payload);

  const valid = await verifyAsync(sigBytes, msgBytes, pubBytes);
  if (!valid) {
    throw new AgentAuthError('Bad signature');
  }

  return {
    verified: {
      agentId: agent.id,
      serverId: agent.serverId,
      publicKey: agent.publicKey,
    },
    body,
  };
}
