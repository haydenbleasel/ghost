import { NextResponse } from "next/server";

import { verifySnapshotDownloadToken } from "@/lib/agent/snapshot-token";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
// Streaming a ~100 MB binary across the public internet to a Hetzner VM can
// take longer than the default function budget on slower links.
export const maxDuration = 300;

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

  // Stream the private Blob through this route. We bypass @vercel/blob's
  // `get()` and fetch directly so the upstream Content-Length / chunked
  // transfer headers come through unmodified — when we hand-rolled the
  // Response with our own Content-Length, the body was being truncated to 0
  // bytes downstream. Native stream + native headers = predictable behavior.
  const upstream = await fetch(build.agentBlobUrl, {
    headers: { Authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!(upstream.ok && upstream.body)) {
    return NextResponse.json(
      { error: "Agent binary not found in store" },
      { status: 404 }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  const len = upstream.headers.get("content-length");
  if (len) {
    headers.set("Content-Length", len);
  }
  return new Response(upstream.body, { headers });
};
