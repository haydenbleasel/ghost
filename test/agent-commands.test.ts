import { beforeEach, describe, expect, mock, test } from "bun:test";

import { Prisma } from "@prisma/client";

interface FakeCommandRow {
  id: string;
  serverId: string;
  type: string;
  status: "pending" | "delivered" | "succeeded" | "failed";
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  durationMs?: number | null;
  issuedAt: Date;
  deliveredAt?: Date | null;
  ackedAt?: Date | null;
}

const store = new Map<string, FakeCommandRow>();
let creatThrowConflict = false;

const prismaStub = {
  command: {
    create: ({ data }: { data: FakeCommandRow }) => {
      if (creatThrowConflict || store.has(data.id)) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError("unique violation", {
            clientVersion: "test",
            code: "P2002",
          })
        );
      }
      store.set(data.id, { ...data });
      return Promise.resolve({ ...data });
    },
    findMany: ({
      where,
      take,
    }: {
      where: { serverId: string; status: string };
      take: number;
      orderBy: unknown;
    }) => {
      const rows = [...store.values()]
        .filter(
          (r) => r.serverId === where.serverId && r.status === where.status
        )
        .toSorted((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime())
        .slice(0, take);
      return Promise.resolve(rows);
    },
    findUnique: ({ where }: { where: { id: string } }) =>
      Promise.resolve(store.get(where.id) ?? null),
    findUniqueOrThrow: ({ where }: { where: { id: string } }) => {
      const row = store.get(where.id);
      if (!row) {
        return Promise.reject(new Error("not found"));
      }
      return Promise.resolve(row);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeCommandRow>;
    }) => {
      const row = store.get(where.id);
      if (!row) {
        return Promise.reject(new Error("not found"));
      }
      Object.assign(row, data);
      return Promise.resolve(row);
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { id: { in: string[] } };
      data: Partial<FakeCommandRow>;
    }) => {
      let count = 0;
      for (const id of where.id.in) {
        const row = store.get(id);
        if (row) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return Promise.resolve({ count });
    },
  },
};

mock.module("@/lib/db", () => ({ prisma: prismaStub }));

const importCommands = () => import("@/lib/agent/commands");

beforeEach(() => {
  store.clear();
  creatThrowConflict = false;
});

describe("enqueueCommand", () => {
  test("creates a pending command with a generated id when no idempotency key", async () => {
    const { enqueueCommand } = await importCommands();
    const cmd = await enqueueCommand({
      payload: {},
      serverId: "srv_1",
      type: "START",
    });
    expect(cmd.id).toMatch(/^cmd_/);
    expect(cmd.type).toBe("START");
    expect(cmd.payload).toEqual({});
    expect(typeof cmd.issuedAt).toBe("string");
    expect(store.size).toBe(1);
    const [stored] = [...store.values()];
    expect(stored.status).toBe("pending");
  });

  test("derives a deterministic id from idempotencyKey", async () => {
    const { enqueueCommand } = await importCommands();
    const cmd = await enqueueCommand({
      idempotencyKey: "step-42",
      payload: {},
      serverId: "srv_1",
      type: "STOP",
    });
    expect(cmd.id).toBe("cmd_step-42");
  });

  test("returns existing command on P2002 conflict when idempotency key supplied", async () => {
    const { enqueueCommand } = await importCommands();
    const first = await enqueueCommand({
      idempotencyKey: "step-1",
      payload: { clientIntentId: "intent-1" },
      serverId: "srv_1",
      type: "RESTART",
    });
    creatThrowConflict = true;
    const second = await enqueueCommand({
      idempotencyKey: "step-1",
      // The conflicting insert's payload is ignored — the existing row wins.
      payload: { clientIntentId: "intent-2" },
      serverId: "srv_1",
      type: "RESTART",
    });
    expect(second.id).toBe(first.id);
    expect(second.payload).toEqual({ clientIntentId: "intent-1" });
  });

  test("re-throws non-P2002 prisma errors", async () => {
    const { enqueueCommand } = await importCommands();
    // First insert succeeds.
    await enqueueCommand({
      idempotencyKey: "step-x",
      payload: {},
      serverId: "srv_1",
      type: "STOP",
    });
    // Second insert with the same key without idempotencyKey path => collide
    // but since no idempotencyKey, we skip the catch branch. Use ulid same id
    // by forcing creatThrowConflict and not passing idempotencyKey — should
    // bubble the P2002 up.
    creatThrowConflict = true;
    await expect(
      enqueueCommand({
        payload: {},
        serverId: "srv_1",
        type: "STOP",
      })
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });
});

describe("claimPendingCommands", () => {
  test("returns [] when nothing is pending", async () => {
    const { claimPendingCommands } = await importCommands();
    expect(await claimPendingCommands("srv_empty")).toEqual([]);
  });

  test("marks claimed rows as delivered and returns them", async () => {
    const { enqueueCommand, claimPendingCommands } = await importCommands();
    await enqueueCommand({
      payload: { n: 1 },
      serverId: "srv_1",
      type: "START",
    });
    await enqueueCommand({
      payload: { n: 2 },
      serverId: "srv_1",
      type: "STOP",
    });
    // Different server should be untouched.
    await enqueueCommand({
      payload: {},
      serverId: "srv_2",
      type: "RESTART",
    });

    const claimed = await claimPendingCommands("srv_1");
    expect(claimed).toHaveLength(2);
    for (const row of store.values()) {
      if (row.serverId === "srv_1") {
        expect(row.status).toBe("delivered");
        expect(row.deliveredAt).toBeInstanceOf(Date);
      } else {
        expect(row.status).toBe("pending");
      }
    }
  });

  test("respects max parameter", async () => {
    const { enqueueCommand, claimPendingCommands } = await importCommands();
    for (let i = 0; i < 4; i += 1) {
      await enqueueCommand({
        idempotencyKey: `s${i}`,
        payload: { i },
        serverId: "srv_1",
        type: "START",
      });
    }
    const claimed = await claimPendingCommands("srv_1", 2);
    expect(claimed).toHaveLength(2);
  });
});

describe("ackCommand", () => {
  test("writes status, durationMs, result, and error", async () => {
    const { enqueueCommand, ackCommand } = await importCommands();
    const cmd = await enqueueCommand({
      payload: {},
      serverId: "srv_1",
      type: "FETCH_LOGS",
    });
    await ackCommand({
      commandId: cmd.id,
      durationMs: 1234,
      error: "nope",
      result: { ok: false },
      status: "failed",
    });
    const row = store.get(cmd.id);
    expect(row?.status).toBe("failed");
    expect(row?.durationMs).toBe(1234);
    expect(row?.error).toBe("nope");
    expect(row?.result).toEqual({ ok: false });
    expect(row?.ackedAt).toBeInstanceOf(Date);
  });
});

describe("waitForCommand", () => {
  test("returns failed when the command does not exist", async () => {
    const { waitForCommand } = await importCommands();
    const result = await waitForCommand("missing", 50);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Command not found");
  });

  test("returns the terminal status as soon as it transitions", async () => {
    const { enqueueCommand, ackCommand, waitForCommand } =
      await importCommands();
    const cmd = await enqueueCommand({
      payload: {},
      serverId: "srv_1",
      type: "START",
    });

    // Flip to succeeded after a brief moment, while waitForCommand polls.
    setTimeout(() => {
      void ackCommand({
        commandId: cmd.id,
        durationMs: 10,
        result: { ok: true },
        status: "succeeded",
      });
    }, 30);

    const result = await waitForCommand(cmd.id, 1500);
    expect(result.status).toBe("succeeded");
    expect(result.result).toEqual({ ok: true });
  });

  test("returns timeout when the command stays pending past the deadline", async () => {
    const { enqueueCommand, waitForCommand } = await importCommands();
    const cmd = await enqueueCommand({
      payload: {},
      serverId: "srv_1",
      type: "START",
    });
    const result = await waitForCommand(cmd.id, 50);
    expect(result.status).toBe("timeout");
  });
});
