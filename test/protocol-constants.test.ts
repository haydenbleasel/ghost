import { describe, expect, test } from "bun:test";

import {
  AGENT_HEADERS,
  BOOTSTRAP_TTL_SECONDS,
  COMMAND_STATUSES,
  COMMAND_TYPES,
  DESIRED_STATES,
  LOG_STREAMS,
  NONCE_TTL_SECONDS,
  OBSERVED_STATES,
  PHASES,
  REDIS_KEYS,
  TIMESTAMP_SKEW_MS,
} from "@/protocol";

describe("REDIS_KEYS", () => {
  test("namespaces activity channel and seq by serverId", () => {
    expect(REDIS_KEYS.activityChannel("srv_1")).toBe("activity:srv_1");
    expect(REDIS_KEYS.activitySeq("srv_1")).toBe("activity-seq:srv_1");
  });

  test("namespaces logs channel and seq by serverId", () => {
    expect(REDIS_KEYS.logsChannel("srv_2")).toBe("logs:srv_2");
    expect(REDIS_KEYS.logsSeq("srv_2")).toBe("logs-seq:srv_2");
  });

  test("namespaces command list by serverId", () => {
    expect(REDIS_KEYS.commandList("srv_3")).toBe("cmd:srv_3");
  });

  test("namespaces nonce by agentId and nonce value", () => {
    expect(REDIS_KEYS.nonce("agent_a", "n1")).toBe("nonce:agent_a:n1");
  });

  test("each builder produces unique keys per serverId", () => {
    const a = REDIS_KEYS.activityChannel("a");
    const b = REDIS_KEYS.activityChannel("b");
    expect(a).not.toBe(b);
  });
});

describe("protocol enums", () => {
  test("PHASES contains expected lifecycle states", () => {
    expect(PHASES).toContain("queued");
    expect(PHASES).toContain("ready");
    expect(PHASES).toContain("deleted");
  });

  test("DESIRED_STATES is the small fixed set", () => {
    expect([...DESIRED_STATES]).toEqual([
      "running",
      "stopped",
      "hibernated",
      "deleted",
    ]);
  });

  test("OBSERVED_STATES, COMMAND_TYPES, COMMAND_STATUSES, LOG_STREAMS are non-empty", () => {
    expect(OBSERVED_STATES.length).toBeGreaterThan(0);
    expect(COMMAND_TYPES.length).toBeGreaterThan(0);
    expect(COMMAND_STATUSES.length).toBeGreaterThan(0);
    expect(LOG_STREAMS).toEqual(["stdout", "stderr"]);
  });
});

describe("protocol header & ttl constants", () => {
  test("AGENT_HEADERS use the x-ghost-* namespace", () => {
    for (const value of Object.values(AGENT_HEADERS)) {
      expect(value.startsWith("x-ghost-")).toBe(true);
    }
  });

  test("ttl constants are positive numbers", () => {
    expect(TIMESTAMP_SKEW_MS).toBeGreaterThan(0);
    expect(NONCE_TTL_SECONDS).toBeGreaterThan(0);
    expect(BOOTSTRAP_TTL_SECONDS).toBeGreaterThan(0);
  });
});
