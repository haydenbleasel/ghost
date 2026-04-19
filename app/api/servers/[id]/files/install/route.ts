import { enqueueCommand } from "@/lib/agent/commands";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  destPath: z.string().min(1).max(512),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i)
    .optional(),
  url: z.string().url(),
});

export const POST = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });
  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const command = await enqueueCommand({
    payload: parsed.data,
    serverId: id,
    type: "FILES_INSTALL_FROM_URL",
  });

  return NextResponse.json({ commandId: command.id });
};
