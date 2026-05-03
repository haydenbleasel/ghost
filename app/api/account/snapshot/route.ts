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
    select: { activeSnapshotBuildId: true, hetznerToken: true },
    where: { id: user.id },
  });
  if (!row?.hetznerToken) {
    return NextResponse.json(
      { error: "Save a Hetzner token before building a snapshot." },
      { status: 412 }
    );
  }
  if (row.activeSnapshotBuildId) {
    return NextResponse.json(
      { error: "A snapshot build is already running." },
      { status: 409 }
    );
  }

  const buildId = ulid();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.snapshotBuild.create({
        data: { id: buildId, status: "pending", userId: user.id },
      });
      await tx.user.update({
        data: { activeSnapshotBuildId: buildId },
        where: { id: user.id },
      });
    });
  } catch {
    return NextResponse.json(
      { error: "A snapshot build is already running." },
      { status: 409 }
    );
  }

  await start(buildSnapshot, [{ buildId, userId: user.id }]);

  return NextResponse.json({ buildId });
};
