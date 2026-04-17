import { prisma } from "@/lib/db";
import { changeServerType, HetznerApiError } from "@/lib/hetzner/client";
import { requireUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const postSchema = z.object({ serverType: z.string().min(1) });

export const POST = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!server.hetznerServerId) {
    return NextResponse.json({ error: "Server is not provisioned yet" }, { status: 409 });
  }

  if (server.observedState !== "stopped") {
    return NextResponse.json({ error: "Server must be stopped before rescaling" }, { status: 409 });
  }

  if (parsed.data.serverType === server.serverType) {
    return NextResponse.json({ error: "Already on this server type" }, { status: 400 });
  }

  try {
    await changeServerType(Number(server.hetznerServerId), parsed.data.serverType);
  } catch (error) {
    if (error instanceof HetznerApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  await prisma.server.update({
    data: { serverType: parsed.data.serverType },
    where: { id },
  });

  return NextResponse.json({ serverType: parsed.data.serverType });
};
