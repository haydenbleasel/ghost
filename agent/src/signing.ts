import crypto from 'node:crypto';
import { signAsync, getPublicKeyAsync } from '@noble/ed25519';
import { AGENT_HEADERS, canonicalize, fromBase64Url, toBase64Url } from '../../protocol';

export async function generateKeypair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const priv = crypto.randomBytes(32);
  const pub = await getPublicKeyAsync(priv);
  return {
    privateKey: toBase64Url(priv),
    publicKey: toBase64Url(pub),
  };
}

export async function signedFetch(input: {
  method: 'GET' | 'POST';
  url: string;
  agentId: string;
  privateKey: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<Response> {
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyStr = input.body === undefined ? '' : JSON.stringify(input.body);

  const url = new URL(input.url);
  const path = url.pathname + url.search;

  const message = canonicalize({
    method: input.method,
    path,
    timestamp,
    nonce,
    body: bodyStr,
  });

  const sig = await signAsync(
    new TextEncoder().encode(message),
    fromBase64Url(input.privateKey)
  );

  const headers: Record<string, string> = {
    [AGENT_HEADERS.AGENT]: input.agentId,
    [AGENT_HEADERS.TIMESTAMP]: timestamp,
    [AGENT_HEADERS.NONCE]: nonce,
    [AGENT_HEADERS.SIGNATURE]: toBase64Url(sig),
    ...(input.extraHeaders ?? {}),
  };

  if (input.method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(input.url, {
    method: input.method,
    headers,
    body: input.method === 'POST' ? bodyStr : undefined,
    signal: input.signal,
  });
}
