import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { teardownServer } from "@/lib/workflows/teardown-server";
import { NextResponse } from "next/server";
import { start } from "workflow/api";

export const runtime = "nodejs";

export const GET = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    include: { agent: { select: { lastHeartbeatAt: true } } },
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ server });
};

export const DELETE = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.server.update({
    data: { desiredState: "deleted" },
    where: { id },
  });

  await start(teardownServer, [{ serverId: id }]);

  return NextResponse.json({ ok: true });
};
