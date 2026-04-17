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
    eventName: 'activity',
    initialCursor,
    pollMs: 1000,
    fetchSince: async (cursor) => {
      const events = await prisma.activityEvent.findMany({
        where: { serverId: id, seq: { gt: cursor } },
        orderBy: { seq: 'asc' },
        take: 200,
      });
      return events.map((event) => ({
        seq: event.seq,
        event: {
          id: event.id,
          seq: event.seq,
          phase: event.phase,
          message: event.message,
          metadata: event.metadata,
          source: event.source,
          occurredAt: event.occurredAt.toISOString(),
        },
      }));
    },
  });
}
