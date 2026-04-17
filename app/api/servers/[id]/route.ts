import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { teardownServer } from '@/lib/workflows/teardown-server';
import { NextResponse } from 'next/server';
import { start } from 'workflow/api';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    include: { agent: { select: { lastHeartbeatAt: true } } },
  });

  if (!server) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ server });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });

  if (!server) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.server.update({
    where: { id },
    data: { desiredState: 'deleted' },
  });

  await start(teardownServer, [{ serverId: id }]);

  return NextResponse.json({ ok: true });
}
