import { prisma } from "@/lib/db";
import { disableServerBackups, enableServerBackups, HetznerApiError } from "@/lib/hetzner/client";
import { requireUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({ enabled: z.boolean() });

export const PATCH = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!server.hetznerServerId) {
    return NextResponse.json({ error: "Server is not provisioned yet" }, { status: 409 });
  }

  const hetznerId = Number(server.hetznerServerId);

  try {
    await (parsed.data.enabled ? enableServerBackups(hetznerId) : disableServerBackups(hetznerId));
  } catch (error) {
    if (error instanceof HetznerApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  await prisma.server.update({
    data: { backupsEnabled: parsed.data.enabled },
    where: { id },
  });

  return NextResponse.json({ backupsEnabled: parsed.data.enabled });
};
