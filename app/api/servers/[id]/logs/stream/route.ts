import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createSseResponse } from "@/lib/sse/stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    select: { id: true },
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const initialCursor = Number(url.searchParams.get("cursor") ?? 0);

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
