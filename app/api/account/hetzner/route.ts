import { NextResponse } from "next/server";
import { z } from "zod";

import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { createHetznerClient } from "@/lib/hetzner";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const postSchema = z.object({
  token: z.string().trim().min(20),
});

export const GET = async () => {
  const user = await requireUser();
  const [row, snapshot] = await Promise.all([
    prisma.user.findUnique({
      select: { hetznerToken: true },
      where: { id: user.id },
    }),
    prisma.userSnapshot.findUnique({
      select: { hetznerImageId: true },
      where: {
        userId_environment: {
          environment: SNAPSHOT_ENVIRONMENT,
          userId: user.id,
        },
      },
    }),
  ]);
  return NextResponse.json({
    configured: Boolean(row?.hetznerToken && snapshot?.hetznerImageId),
    imageId: snapshot?.hetznerImageId ?? null,
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

  const client = createHetznerClient(parsed.data.token);

  const tokenCheck = await client.GET("/locations", {
    params: { query: { per_page: 1 } },
  });
  if (tokenCheck.response.status === 401) {
    return NextResponse.json(
      { error: "Hetzner rejected this token." },
      { status: 400 }
    );
  }
  if (!tokenCheck.response.ok) {
    return NextResponse.json(
      { error: "Could not reach Hetzner to verify the token." },
      { status: 502 }
    );
  }

  await prisma.user.update({
    data: { hetznerToken: encryptSecret(parsed.data.token) },
    where: { id: user.id },
  });

  return NextResponse.json({ ok: true });
};

export const DELETE = async () => {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.user.update({
      data: { hetznerToken: null },
      where: { id: user.id },
    }),
    prisma.userSnapshot.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ configured: false });
};
