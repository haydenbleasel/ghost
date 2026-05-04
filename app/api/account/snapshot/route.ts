import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { start } from "workflow/api";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildSnapshot } from "@/lib/workflows/build-snapshot";

export const runtime = "nodejs";

export const GET = async () => {
  const user = await requireUser();
  const build = await prisma.snapshotBuild.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      errorReason: true,
      finishedAt: true,
      id: true,
      previousSnapshotId: true,
      snapshotId: true,
      status: true,
    },
    where: { userId: user.id },
  });
  return NextResponse.json({ build });
};

export const POST = async () => {
  const user = await requireUser();

  const row = await prisma.user.findUnique({
    select: { hetznerToken: true },
    where: { id: user.id },
  });
  if (!row?.hetznerToken) {
    return NextResponse.json(
      { error: "Save a Hetzner token before building a snapshot." },
      { status: 412 }
    );
  }

  const buildId = ulid();
  let alreadyRunning = false;
  await prisma.$transaction(async (tx) => {
    // Row-lock the user so concurrent POSTs serialize on the same user.
    await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${user.id} FOR UPDATE`;
    const active = await tx.snapshotBuild.findFirst({
      select: { id: true },
      where: {
        status: { notIn: ["ready", "failed"] },
        userId: user.id,
      },
    });
    if (active) {
      alreadyRunning = true;
      return;
    }
    await tx.snapshotBuild.create({
      data: { id: buildId, status: "pending", userId: user.id },
    });
  });

  if (alreadyRunning) {
    return NextResponse.json(
      { error: "A snapshot build is already running." },
      { status: 409 }
    );
  }

  await start(buildSnapshot, [{ buildId, userId: user.id }]);

  return NextResponse.json({ buildId });
};
