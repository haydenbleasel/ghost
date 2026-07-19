import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { start } from "workflow/api";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildSnapshot } from "@/lib/workflows/build-snapshot";

export const runtime = "nodejs";

export const GET = async () => {
  await requireUser();
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
  });
  return NextResponse.json({ build });
};

export const POST = async () => {
  await requireUser();

  const buildId = ulid();
  let alreadyRunning = false;
  await prisma.$transaction(async (tx) => {
    // Advisory lock so concurrent POSTs serialize; released at commit.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('ghost.snapshot-build'))`;
    const active = await tx.snapshotBuild.findFirst({
      select: { id: true },
      where: { status: { notIn: ["ready", "failed"] } },
    });
    if (active) {
      alreadyRunning = true;
      return;
    }
    await tx.snapshotBuild.create({
      data: { id: buildId, status: "pending" },
    });
  });

  if (alreadyRunning) {
    return NextResponse.json(
      { error: "A snapshot build is already running." },
      { status: 409 }
    );
  }

  try {
    await start(buildSnapshot, [{ buildId }]);
  } catch (error) {
    // The build row was already committed; a non-terminal status would make
    // the "already running" guard reject every future build.
    await prisma.snapshotBuild.update({
      data: {
        errorReason: "Failed to start build workflow",
        finishedAt: new Date(),
        status: "failed",
      },
      where: { id: buildId },
    });
    throw error;
  }

  return NextResponse.json({ buildId });
};
