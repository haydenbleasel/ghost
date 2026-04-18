import crypto from "node:crypto";
import { games, validateSettings } from "@/games";
import { prisma } from "@/lib/db";
import { getHetznerCatalog } from "@/lib/hetzner/catalog";
import { requireUser } from "@/lib/session";
import { provisionServer } from "@/lib/workflows/provision-server";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { start } from "workflow/api";
import { z } from "zod";

export const runtime = "nodejs";

const createServerSchema = z.object({
  game: z.enum(games.map((g) => g.id) as [string, ...string[]]),
  location: z.string().min(1),
  name: z.string().min(3).max(40),
  serverType: z.string().min(1),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const GET = async () => {
  const user = await requireUser();

  const servers = await prisma.server.findMany({
    orderBy: { createdAt: "desc" },
    where: { deletedAt: null, userId: user.id },
  });

  return NextResponse.json({ servers });
};

export const POST = async (request: Request) => {
  const user = await requireUser();

  const body = await request.json().catch(() => null);
  const parsed = createServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { details: parsed.error.flatten(), error: "Invalid body" },
      { status: 400 },
    );
  }

  const game = games.find((g) => g.id === parsed.data.game);
  if (!game) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  const catalog = await getHetznerCatalog();
  const type = catalog.serverTypes.find((t) => t.name === parsed.data.serverType);
  if (!type) {
    return NextResponse.json({ error: "Unknown server type" }, { status: 400 });
  }
  if (type.memory < game.requirements.memory || type.cores < game.requirements.cpu) {
    return NextResponse.json(
      { error: "Server type does not meet game requirements" },
      { status: 400 },
    );
  }
  const location = type.locations.find((l) => l.name === parsed.data.location);
  if (!location) {
    return NextResponse.json(
      { error: "Region not supported for this server type" },
      { status: 400 },
    );
  }
  if (!location.available) {
    return NextResponse.json(
      { error: "Region is temporarily unavailable. Please pick another." },
      { status: 409 },
    );
  }

  let settings: Record<string, unknown> = {};
  if (parsed.data.settings) {
    const validation = validateSettings(game.settings, parsed.data.settings);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    settings = validation.data as Record<string, unknown>;
  }

  const id = ulid();
  const rconPassword = crypto.randomBytes(16).toString("hex");

  const server = await prisma.server.create({
    data: {
      desiredState: "running",
      game: parsed.data.game,
      id,
      location: parsed.data.location,
      name: parsed.data.name,
      observedState: "pending",
      phase: "queued",
      rconPassword,
      serverType: parsed.data.serverType,
      settings: settings as Prisma.InputJsonValue,
      userId: user.id,
    },
  });

  await start(provisionServer, [{ serverId: server.id }]);

  return NextResponse.json({ server });
};
