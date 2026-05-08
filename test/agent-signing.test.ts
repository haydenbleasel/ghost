import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import { getPublicKeyAsync, signAsync, utils as edUtils } from "@noble/ed25519";

import { AGENT_HEADERS, canonicalize, toBase64Url } from "@/protocol";

interface FakeAgent {
  id: string;
  publicKey: string;
  serverId: string;
}

const agents = new Map<string, FakeAgent>();
const usedNonces = new Set<string>();

const prismaStub = {
  agent: {
    findUnique: ({ where }: { where: { id: string } }) =>
      Promise.resolve(agents.get(where.id) ?? null),
  },
};

const redisStub = {
  set: (key: string, _value: string, opts: { nx?: boolean; ex?: number }) => {
    if (opts?.nx && usedNonces.has(key)) {
      return Promise.resolve(null);
    }
    usedNonces.add(key);
    return Promise.resolve("OK");
  },
};

mock.module("@/lib/db", () => ({ prisma: prismaStub }));
mock.module("@/lib/redis", () => ({ redis: redisStub }));

const importSigning = () => import("@/lib/agent/signing");

const buildSignedRequest = async (
  overrides: {
    method?: string;
    url?: string;
    body?: string;
    agentId?: string;
    publicKey: Uint8Array;
    privateKey: Uint8Array;
    timestamp?: number;
    nonce?: string;
    signatureOverride?: string;
  } = {} as never
) => {
  const method = overrides.method ?? "POST";
  const url = overrides.url ?? "https://example.com/api/agent/heartbeat";
  const body = overrides.body ?? '{"hello":"world"}';
  const timestamp = String(overrides.timestamp ?? Date.now());
  const nonce = overrides.nonce ?? `nonce-${Math.random()}`;
  const agentId = overrides.agentId ?? "agent_1";

  const path = new URL(url).pathname + new URL(url).search;
  const payload = canonicalize({ body, method, nonce, path, timestamp });
  const sigBytes = await signAsync(
    new TextEncoder().encode(payload),
    overrides.privateKey
  );
  const signature = overrides.signatureOverride ?? toBase64Url(sigBytes);

  return new Request(url, {
    body: method === "GET" ? undefined : body,
    headers: {
      [AGENT_HEADERS.AGENT]: agentId,
      [AGENT_HEADERS.NONCE]: nonce,
      [AGENT_HEADERS.SIGNATURE]: signature,
      [AGENT_HEADERS.TIMESTAMP]: timestamp,
    },
    method,
  });
};

let privateKey: Uint8Array;
let publicKey: Uint8Array;
let errorSpy: ReturnType<typeof spyOn>;

beforeEach(async () => {
  agents.clear();
  usedNonces.clear();
  privateKey = edUtils.randomSecretKey();
  publicKey = await getPublicKeyAsync(privateKey);
  agents.set("agent_1", {
    id: "agent_1",
    publicKey: toBase64Url(publicKey),
    serverId: "srv_1",
  });
  // The SUT logs structured diagnostics on negative paths; silence them so
  // test output stays clean.
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("verifyAgentRequest", () => {
  test("verifies a well-formed signed request and returns body + identity", async () => {
    const { verifyAgentRequest } = await importSigning();
    const req = await buildSignedRequest({ privateKey, publicKey });
    const { verified, body } = await verifyAgentRequest(req);
    expect(verified).toEqual({
      agentId: "agent_1",
      publicKey: toBase64Url(publicKey),
      serverId: "srv_1",
    });
    expect(body).toBe('{"hello":"world"}');
  });

  test("throws AgentAuthError when any signature header is missing", async () => {
    const { verifyAgentRequest, AgentAuthError } = await importSigning();
    const req = new Request("https://example.com/x", {
      body: "",
      method: "POST",
    });
    let caught: unknown;
    try {
      await verifyAgentRequest(req);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AgentAuthError);
    expect((caught as { status: number }).status).toBe(401);
  });

  test("throws on a non-numeric timestamp", async () => {
    const { verifyAgentRequest, AgentAuthError } = await importSigning();
    const req = new Request("https://example.com/x", {
      body: "",
      headers: {
        [AGENT_HEADERS.AGENT]: "agent_1",
        [AGENT_HEADERS.NONCE]: "n",
        [AGENT_HEADERS.SIGNATURE]: "s",
        [AGENT_HEADERS.TIMESTAMP]: "not-a-number",
      },
      method: "POST",
    });
    await expect(verifyAgentRequest(req)).rejects.toBeInstanceOf(
      AgentAuthError
    );
  });

  test("throws when timestamp skew exceeds the allowed window", async () => {
    const { verifyAgentRequest, AgentAuthError } = await importSigning();
    const req = await buildSignedRequest({
      privateKey,
      publicKey,
      timestamp: Date.now() - 5 * 60 * 1000,
    });
    let caught: { status?: number; message?: string } | undefined;
    try {
      await verifyAgentRequest(req);
    } catch (error) {
      caught = error as never;
    }
    expect(caught).toBeInstanceOf(AgentAuthError);
    expect(caught?.message).toMatch(/skew/u);
  });

  test("returns 409 when the nonce has already been used", async () => {
    const { verifyAgentRequest, AgentAuthError } = await importSigning();
    const nonce = "nonce-replay";
    const req1 = await buildSignedRequest({ nonce, privateKey, publicKey });
    await verifyAgentRequest(req1);

    const req2 = await buildSignedRequest({ nonce, privateKey, publicKey });
    let caught: { status?: number } | undefined;
    try {
      await verifyAgentRequest(req2);
    } catch (error) {
      caught = error as never;
    }
    expect(caught).toBeInstanceOf(AgentAuthError);
    expect(caught?.status).toBe(409);
  });

  test("returns 404 when the agent is unknown", async () => {
    const { verifyAgentRequest, AgentAuthError } = await importSigning();
    const req = await buildSignedRequest({
      agentId: "agent_unknown",
      privateKey,
      publicKey,
    });
    let caught: { status?: number } | undefined;
    try {
      await verifyAgentRequest(req);
    } catch (error) {
      caught = error as never;
    }
    expect(caught).toBeInstanceOf(AgentAuthError);
    expect(caught?.status).toBe(404);
  });

  test("rejects a tampered body even when other headers match", async () => {
    const { verifyAgentRequest, AgentAuthError } = await importSigning();

    // Build a properly-signed request, then re-create it with a different body.
    const ts = String(Date.now());
    const nonce = "nonce-tamper";
    const original = '{"v":1}';
    const path = "/api/agent/heartbeat";
    const payload = canonicalize({
      body: original,
      method: "POST",
      nonce,
      path,
      timestamp: ts,
    });
    const sig = toBase64Url(
      await signAsync(new TextEncoder().encode(payload), privateKey)
    );

    const tamperedReq = new Request(`https://example.com${path}`, {
      body: '{"v":2}',
      headers: {
        [AGENT_HEADERS.AGENT]: "agent_1",
        [AGENT_HEADERS.NONCE]: nonce,
        [AGENT_HEADERS.SIGNATURE]: sig,
        [AGENT_HEADERS.TIMESTAMP]: ts,
      },
      method: "POST",
    });

    await expect(verifyAgentRequest(tamperedReq)).rejects.toBeInstanceOf(
      AgentAuthError
    );
  });

  test("includes path + query in the signed payload", async () => {
    const { verifyAgentRequest } = await importSigning();
    const req = await buildSignedRequest({
      privateKey,
      publicKey,
      url: "https://example.com/api/agent/poll?cursor=12",
    });
    const { verified } = await verifyAgentRequest(req);
    expect(verified.agentId).toBe("agent_1");
  });
});

describe("AgentAuthError", () => {
  test("defaults status to 401 and is named", async () => {
    const { AgentAuthError } = await importSigning();
    const err = new AgentAuthError("nope");
    expect(err.status).toBe(401);
    expect(err.name).toBe("AgentAuthError");
    expect(err).toBeInstanceOf(Error);
  });

  test("accepts a custom status", async () => {
    const { AgentAuthError } = await importSigning();
    expect(new AgentAuthError("conflict", 409).status).toBe(409);
  });
});
