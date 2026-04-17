import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { createSseResponse } from '@/lib/sse/stream';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { id: true },
  });

  if (!server) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const initialCursor = Number(url.searchParams.get('cursor') ?? 0);

  return createSseResponse({
    eventName: 'log',
    initialCursor,
    pollMs: 500,
    fetchSince: async (cursor) => {
      const chunks = await prisma.logChunk.findMany({
        where: { serverId: id, seq: { gt: cursor } },
        orderBy: { seq: 'asc' },
        take: 1000,
      });
      return chunks.map((chunk) => ({
        seq: chunk.seq,
        event: {
          id: chunk.id,
          seq: chunk.seq,
          stream: chunk.stream,
          line: chunk.line,
          ts: chunk.ts.toISOString(),
        },
      }));
    },
  });
}
