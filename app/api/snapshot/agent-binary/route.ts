import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { verifySnapshotDownloadToken } from "@/lib/agent/snapshot-token";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let buildId: string;
  try {
    ({ buildId } = await verifySnapshotDownloadToken(token));
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const build = await prisma.snapshotBuild.findUnique({
    select: { agentBlobUrl: true, status: true },
    where: { id: buildId },
  });
  if (!build?.agentBlobUrl) {
    return NextResponse.json(
      { error: "Agent binary not available" },
      { status: 404 }
    );
  }
  if (build.status === "ready" || build.status === "failed") {
    return NextResponse.json(
      { error: "Build is no longer active" },
      { status: 410 }
    );
  }

  const result = await get(build.agentBlobUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json(
      { error: "Agent binary not found in store" },
      { status: 404 }
    );
  }

  return new Response(result.stream, {
    headers: {
      "Content-Length": String(result.blob.size),
      "Content-Type": "application/octet-stream",
    },
  });
};
