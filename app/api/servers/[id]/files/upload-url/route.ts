import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export const POST = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      onBeforeGenerateToken: () =>
        Promise.resolve({
          addRandomSuffix: true,
          allowedContentTypes: [
            "application/java-archive",
            "application/zip",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          validUntil: Date.now() + 60 * 1000,
        }),
      onUploadCompleted: () => Promise.resolve(),
      request,
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload token failed" },
      { status: 400 }
    );
  }
};
