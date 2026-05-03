import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { hetzner } from "@/lib/hetzner";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type HetznerError = { error?: { message?: string } } | undefined;

const hetznerErrorMessage = (error: unknown, response: Response): string => {
  const body = error as HetznerError;
  return body?.error?.message ?? response.statusText;
};

export const POST = async (
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> }
) => {
  const user = await requireUser();
  const { id, imageId } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsedImageId = Number(imageId);
  if (!Number.isFinite(parsedImageId)) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }

  if (!server.hetznerServerId) {
    return NextResponse.json(
      { error: "Server is not provisioned yet" },
      { status: 409 }
    );
  }

  const hetznerServerId = Number(server.hetznerServerId);

  const {
    data: imageData,
    error: getError,
    response: getResponse,
  } = await hetzner.GET("/images/{id}", {
    params: { path: { id: parsedImageId } },
  });

  if (!getResponse.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(getError, getResponse) },
      { status: getResponse.status }
    );
  }

  const image = imageData?.image;
  const belongs =
    image?.bound_to === hetznerServerId ||
    (image?.type === "snapshot" && image.created_from?.id === hetznerServerId);

  if (!(image && belongs)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (image.status !== "available") {
    return NextResponse.json(
      { error: "This backup is not ready yet" },
      { status: 409 }
    );
  }

  const { error, response } = await hetzner.POST(
    "/servers/{id}/actions/rebuild",
    {
      body: { image: String(parsedImageId) },
      params: { path: { id: hetznerServerId } },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(error, response) },
      { status: response.status }
    );
  }

  await prisma.server.update({
    data: { desiredState: "running" },
    where: { id },
  });

  return NextResponse.json({ ok: true });
};
