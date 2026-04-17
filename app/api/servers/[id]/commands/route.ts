import crypto from 'node:crypto';
import { enqueueCommand } from '@/lib/agent/commands';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const userCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START') }),
  z.object({ type: z.literal('STOP') }),
  z.object({ type: z.literal('RESTART') }),
]);

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => null);
  const parsed = userCommandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const desiredState =
    parsed.data.type === 'STOP'
      ? 'stopped'
      : parsed.data.type === 'START'
        ? 'running'
        : server.desiredState;

  await prisma.server.update({
    where: { id },
    data: { desiredState },
  });

  const payload =
    parsed.data.type === 'RESTART'
      ? { clientIntentId: crypto.randomUUID() }
      : {};

  const command = await enqueueCommand({
    serverId: id,
    type: parsed.data.type,
    payload,
  });

  return NextResponse.json({ command });
}
