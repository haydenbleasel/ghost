import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    include: { agent: { select: { lastHeartbeatAt: true } } },
    where: { deletedAt: null, id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ server });
};
