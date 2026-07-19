import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createSseResponse } from "@/lib/sse/stream";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  await requireUser();
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
    eventName: "log",
    fetchSince: async (cursor) => {
      const chunks = await prisma.logChunk.findMany({
        orderBy: { seq: "asc" },
        take: 1000,
        where: { seq: { gt: cursor }, serverId: id },
      });
      return chunks.map((chunk) => ({
        event: {
          id: chunk.id,
          line: chunk.line,
          seq: chunk.seq,
          stream: chunk.stream,
          ts: chunk.ts.toISOString(),
        },
        seq: chunk.seq,
      }));
    },
    initialCursor,
    pollMs: 500,
  });
};
