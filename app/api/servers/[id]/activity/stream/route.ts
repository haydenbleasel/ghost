import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createSseResponse } from "@/lib/sse/stream";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    select: { id: true },
    where: { deletedAt: null, id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const rawCursor = Number(url.searchParams.get("cursor") ?? 0);
  // A non-numeric cursor would flow into Prisma as `seq: { gt: NaN }` and
  // error the stream immediately.
  const initialCursor = Number.isFinite(rawCursor) ? rawCursor : 0;

  return createSseResponse({
    eventName: "activity",
    fetchSince: async (cursor) => {
      const events = await prisma.activityEvent.findMany({
        orderBy: { seq: "asc" },
        take: 200,
        where: { seq: { gt: cursor }, serverId: id },
      });
      return events.map((event) => ({
        event: {
          id: event.id,
          message: event.message,
          metadata: event.metadata,
          occurredAt: event.occurredAt.toISOString(),
          phase: event.phase,
          seq: event.seq,
          source: event.source,
        },
        seq: event.seq,
      }));
    },
    initialCursor,
    pollMs: 1000,
  });
};
