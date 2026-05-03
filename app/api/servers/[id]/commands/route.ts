import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const userCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("START") }),
  z.object({ type: z.literal("STOP") }),
  z.object({ type: z.literal("RESTART") }),
]);

export const POST = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = userCommandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let { desiredState } = server;
  if (parsed.data.type === "STOP") {
    desiredState = "stopped";
  } else if (parsed.data.type === "START") {
    desiredState = "running";
  }

  await prisma.server.update({
    data: { desiredState },
    where: { id },
  });

  const payload =
    parsed.data.type === "RESTART"
      ? { clientIntentId: crypto.randomUUID() }
      : {};

  const command = await enqueueCommand({
    payload,
    serverId: id,
    type: parsed.data.type,
  });

  return NextResponse.json({ command });
};
