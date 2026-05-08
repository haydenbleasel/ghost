import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Why: zod 4.4 changed how discriminated unions handle fields overridden
// with z.undefined() via .extend(), which breaks @workflow/world's runtime
// schema validation (every callback throws and runs wedge in `pending`).
// See commit 743f3c0 — "Fix workflow-zod version issue".
// `@workflow/world` declares an exact-version peer dep on zod, so our
// top-level zod must match it byte-for-byte. `npm-check-updates` and
// similar tools love to bump this — guard the pin here.

const ROOT = join(import.meta.dir, "..");

interface PackageJson {
  dependencies?: Record<string, string>;
}

const readPackageJson = (): PackageJson =>
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8")) as PackageJson;

// bun.lock is JSONC — strip trailing commas before parsing.
const readBunLock = (): unknown => {
  const raw = readFileSync(join(ROOT, "bun.lock"), "utf-8");
  return JSON.parse(raw.replaceAll(/,(\s*[}\]])/gu, "$1"));
};

const findWorkflowWorldZodPeer = (lock: unknown): string => {
  const { packages } = lock as { packages?: Record<string, unknown> };
  if (!packages) {
    throw new Error("bun.lock has no `packages` map");
  }
  const entry = packages["@workflow/world"];
  if (!Array.isArray(entry)) {
    throw new TypeError("@workflow/world not found in bun.lock");
  }
  const meta = entry[2] as { peerDependencies?: Record<string, string> };
  const zod = meta?.peerDependencies?.zod;
  if (!zod) {
    throw new Error("@workflow/world has no zod peer dependency");
  }
  return zod;
};

describe("zod version pin", () => {
  test("package.json pins zod to an exact version (no ^ or ~)", () => {
    const { dependencies } = readPackageJson();
    const zod = dependencies?.zod;
    expect(zod).toBeDefined();
    expect(zod).toMatch(/^\d+\.\d+\.\d+$/u);
  });

  test("package.json zod matches @workflow/world's peer dependency", () => {
    const { dependencies } = readPackageJson();
    const declared = dependencies?.zod;
    const required = findWorkflowWorldZodPeer(readBunLock());
    expect(declared).toBe(required);
  });
});
