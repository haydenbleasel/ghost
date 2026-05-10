import { NextResponse } from "next/server";
import { z } from "zod";

import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { createHetznerProvider } from "@/lib/providers/hetzner";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const postSchema = z.object({
  token: z.string().trim().min(20),
});

export const GET = async () => {
  const user = await requireUser();
  const [row, snapshot] = await Promise.all([
    prisma.user.findUnique({
      select: { providerToken: true },
      where: { id: user.id },
    }),
    prisma.userSnapshot.findUnique({
      select: { providerImageId: true },
      where: {
        userId_environment: {
          environment: SNAPSHOT_ENVIRONMENT,
          userId: user.id,
        },
      },
    }),
  ]);
  return NextResponse.json({
    configured: Boolean(row?.providerToken && snapshot?.providerImageId),
    imageId: snapshot?.providerImageId ?? null,
  });
};

export const POST = async (request: Request) => {
  const user = await requireUser();

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { details: parsed.error.flatten(), error: "Invalid body" },
      { status: 400 }
    );
  }

  const provider = createHetznerProvider(parsed.data.token);
  const validation = await provider.validateCredentials();
  if (!validation.ok) {
    if (validation.reason === "unauthorized") {
      return NextResponse.json(
        { error: "Hetzner rejected this token." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Could not reach Hetzner to verify the token." },
      { status: 502 }
    );
  }

  await prisma.user.update({
    data: { providerToken: encryptSecret(parsed.data.token) },
    where: { id: user.id },
  });

  return NextResponse.json({ ok: true });
};

export const DELETE = async () => {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.user.update({
      data: { providerToken: null },
      where: { id: user.id },
    }),
    prisma.userSnapshot.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ configured: false });
};
