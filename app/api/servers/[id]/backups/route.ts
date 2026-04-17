import { prisma } from "@/lib/db";
import { hetzner } from "@/lib/hetzner";
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

  const path = parsed.data.enabled
    ? ("/servers/{id}/actions/enable_backup" as const)
    : ("/servers/{id}/actions/disable_backup" as const);
  const { error: apiError, response } = await hetzner.POST(path, {
    params: { path: { id: hetznerId } },
  });
  if (!response.ok) {
    const errorBody = apiError as { error?: { message?: string } } | undefined;
    const message = errorBody?.error?.message ?? response.statusText;
    return NextResponse.json({ error: message }, { status: response.status });
  }

  await prisma.server.update({
    data: { backupsEnabled: parsed.data.enabled },
    where: { id },
  });

  return NextResponse.json({ backupsEnabled: parsed.data.enabled });
};
