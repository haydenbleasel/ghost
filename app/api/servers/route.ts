import crypto from 'node:crypto';
import { games } from '@/games';
import { prisma } from '@/lib/db';
import { getHetznerCatalog } from '@/lib/hetzner/catalog';
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
  location: z.string().min(1),
  serverType: z.string().min(1),
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

  const game = games.find((g) => g.id === parsed.data.game);
  if (!game) {
    return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
  }

  const catalog = await getHetznerCatalog();
  const type = catalog.serverTypes.find(
    (t) => t.name === parsed.data.serverType
  );
  if (!type) {
    return NextResponse.json(
      { error: 'Unknown server type' },
      { status: 400 }
    );
  }
  if (
    type.memory < game.requirements.memory ||
    type.cores < game.requirements.cpu
  ) {
    return NextResponse.json(
      { error: 'Server type does not meet game requirements' },
      { status: 400 }
    );
  }
  const location = type.locations.find((l) => l.name === parsed.data.location);
  if (!location) {
    return NextResponse.json(
      { error: 'Region not supported for this server type' },
      { status: 400 }
    );
  }
  if (!location.available) {
    return NextResponse.json(
      { error: 'Region is temporarily unavailable. Please pick another.' },
      { status: 409 }
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
      location: parsed.data.location,
      serverType: parsed.data.serverType,
      rconPassword,
      desiredState: 'running',
      observedState: 'pending',
      phase: 'queued',
    },
  });

  await start(provisionServer, [{ serverId: server.id }]);

  return NextResponse.json({ server });
}
