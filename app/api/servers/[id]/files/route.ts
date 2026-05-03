import { NextResponse } from "next/server";

import { enqueueCommand, waitForCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { filesListResultSchema } from "@/protocol";

export const runtime = "nodejs";
export const maxDuration = 30;

const requireOwnedServer = async (id: string) => {
  const user = await requireUser();
  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });
  if (!server) {
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    } as const;
  }
  return { server } as const;
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const owned = await requireOwnedServer(id);
  if ("error" in owned) {
    return owned.error;
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";

  const command = await enqueueCommand({
    payload: { path },
    serverId: id,
    type: "FILES_LIST",
  });

  const outcome = await waitForCommand(command.id);
  if (outcome.status === "timeout") {
    return NextResponse.json(
      { error: "Agent did not respond — server may be offline" },
      { status: 504 }
    );
  }
  if (outcome.status === "failed") {
    return NextResponse.json(
      { error: outcome.error ?? "List failed" },
      { status: 500 }
    );
  }

  const parsed = filesListResultSchema.safeParse(outcome.result);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid result" }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
};

export const DELETE = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const owned = await requireOwnedServer(id);
  if ("error" in owned) {
    return owned.error;
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const command = await enqueueCommand({
    payload: { path },
    serverId: id,
    type: "FILES_DELETE",
  });

  const outcome = await waitForCommand(command.id);
  if (outcome.status === "timeout") {
    return NextResponse.json(
      { error: "Agent did not respond — server may be offline" },
      { status: 504 }
    );
  }
  if (outcome.status === "failed") {
    return NextResponse.json(
      { error: outcome.error ?? "Delete failed" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
};
