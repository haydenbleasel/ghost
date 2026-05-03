import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string; commandId: string }> }
) => {
  const user = await requireUser();
  const { id, commandId } = await context.params;

  const server = await prisma.server.findFirst({
    select: { id: true },
    where: { deletedAt: null, id, userId: user.id },
  });
  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const command = await prisma.command.findFirst({
    select: { error: true, id: true, result: true, status: true, type: true },
    where: { id: commandId, serverId: id },
  });
  if (!command) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(command);
};
