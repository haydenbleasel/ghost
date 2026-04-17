import crypto from 'node:crypto';
import { games } from '@/games';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { requireUser } from '@/lib/session';
import { provisionServer } from '@/lib/workflows/provision-server';
import { NextResponse } from 'next/server';
import { ulid } from 'ulid';
import { start } from 'workflow/api';
import { z } from 'zod';

export const runtime = 'nodejs';

const createServerSchema = z.object({
  name: z.string().min(3).max(40),
  game: z.enum(games.map((g) => g.id) as [string, ...string[]]),
  location: z.string().optional(),
  serverType: z.string().optional(),
});

export async function GET() {
  const user = await requireUser();

  const servers = await prisma.server.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ servers });
}

export async function POST(request: Request) {
  const user = await requireUser();

  const body = await request.json().catch(() => null);
  const parsed = createServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const id = ulid();
  const rconPassword = crypto.randomBytes(16).toString('hex');

  const server = await prisma.server.create({
    data: {
      id,
      userId: user.id,
      name: parsed.data.name,
      game: parsed.data.game,
      location: parsed.data.location ?? env.HETZNER_LOCATION,
      serverType: parsed.data.serverType ?? env.HETZNER_SERVER_TYPE,
      rconPassword,
      desiredState: 'running',
      observedState: 'pending',
      phase: 'queued',
    },
  });

  await start(provisionServer, [{ serverId: server.id }]);

  return NextResponse.json({ server });
}
