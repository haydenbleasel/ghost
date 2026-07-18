"use server";

import crypto from "node:crypto";

import type { Prisma } from "@prisma/client";
import { humanId } from "human-id";
import { revalidatePath } from "next/cache";
import { ulid } from "ulid";
import { start } from "workflow/api";
import { z } from "zod";

import { games, validateSettings } from "@/games";
import { prisma } from "@/lib/db";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { getProviderWithImage } from "@/lib/providers";
import { MissingProviderCredentialsError } from "@/lib/providers/errors";
import type { Catalog } from "@/lib/providers/types";
import { requireUser } from "@/lib/session";
import { provisionServer } from "@/lib/workflows/provision-server";

const createServerSchema = z.object({
  game: z.enum(games.map((g) => g.id) as [string, ...string[]]),
  location: z.string().min(1),
  name: z.string().min(3).max(40),
  serverType: z.string().min(1),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type CreateServerInput = z.infer<typeof createServerSchema>;

export type CreateServerResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export const createServer = async (
  input: CreateServerInput
): Promise<CreateServerResult> => {
  await requireUser();

  const parsed = createServerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", ok: false };
  }

  const game = games.find((g) => g.id === parsed.data.game);
  if (!game) {
    return { error: "Unknown game", ok: false };
  }

  let catalog: Catalog;
  try {
    const { provider, imageId } =
      await getProviderWithImage(SNAPSHOT_ENVIRONMENT);
    catalog = await provider.getCatalog(imageId);
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      return {
        error: "Build a snapshot in account settings first.",
        ok: false,
      };
    }
    throw error;
  }

  const type = catalog.serverTypes.find(
    (t) => t.name === parsed.data.serverType
  );
  if (!type) {
    return { error: "Unknown server type", ok: false };
  }
  if (
    type.memory < game.requirements.memory ||
    type.cores < game.requirements.cpu ||
    type.disk < game.requirements.disk
  ) {
    return { error: "Server type does not meet game requirements", ok: false };
  }

  const location = type.locations.find((l) => l.name === parsed.data.location);
  if (!location) {
    return { error: "Region not supported for this server type", ok: false };
  }
  if (!location.available) {
    return {
      error: "Region is temporarily unavailable. Please pick another.",
      ok: false,
    };
  }

  // Always validate, even when no settings were sent: required fields (e.g.
  // Don't Starve Together's cluster token) must block creation, otherwise a
  // crafted request provisions a paid VM that can never start.
  const validation = validateSettings(
    game.settings,
    parsed.data.settings ?? {}
  );
  if (!validation.ok) {
    return { error: validation.error, ok: false };
  }
  const settings = validation.data as Record<string, unknown>;

  const id = ulid();
  const rconPassword = crypto.randomBytes(16).toString("hex");
  const joinPassword = game.usesJoinPassword
    ? humanId({ adjectiveCount: 0, capitalize: false, separator: "-" })
    : null;

  const server = await prisma.server.create({
    data: {
      desiredState: "running",
      game: parsed.data.game,
      id,
      joinPassword,
      location: parsed.data.location,
      name: parsed.data.name,
      observedState: "pending",
      phase: "queued",
      rconPassword,
      serverType: parsed.data.serverType,
      settings: settings as Prisma.InputJsonValue,
    },
  });

  await start(provisionServer, [{ serverId: server.id }]);

  revalidatePath("/dashboard", "layout");

  return { id: server.id, ok: true };
};
