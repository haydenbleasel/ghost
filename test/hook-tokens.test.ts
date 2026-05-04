import { describe, expect, test } from "bun:test";

import { hookTokens } from "@/lib/workflows/hook-tokens";

describe("hookTokens", () => {
  test("formats per-server cancel/enrolled/phase tokens", () => {
    expect(hookTokens.cancel("srv_1")).toBe("server:srv_1:cancel");
    expect(hookTokens.enrolled("srv_1")).toBe("server:srv_1:enrolled");
    expect(hookTokens.phase("srv_1")).toBe("server:srv_1:phase");
  });

  test("namespaces are unique per kind for the same server", () => {
    const id = "srv_42";
    const tokens = new Set([
      hookTokens.cancel(id),
      hookTokens.enrolled(id),
      hookTokens.phase(id),
    ]);
    expect(tokens.size).toBe(3);
  });
});
