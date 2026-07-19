import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderApiError } from "@/lib/providers/errors";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const apiErrorResponse = (error: ProviderApiError) =>
  NextResponse.json({ error: error.message }, { status: error.status });

export const POST = async (
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> }
) => {
  await requireUser();
  const { id, imageId } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!server.providerServerId) {
    return NextResponse.json(
      { error: "Server is not provisioned yet" },
      { status: 409 }
    );
  }

  const provider = getProvider();

  try {
    const image = await provider.getImage(imageId);
    const belongs =
      image &&
      (image.boundToServerId === server.providerServerId ||
        (image.type === "snapshot" &&
          image.createdFromServerId === server.providerServerId));
    if (!(image && belongs)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (image.status !== "available") {
      return NextResponse.json(
        { error: "This backup is not ready yet" },
        { status: 409 }
      );
    }
    await provider.rebuildFromImage(server.providerServerId, imageId);
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return apiErrorResponse(error);
    }
    throw error;
  }

  await prisma.server.update({
    data: { desiredState: "running" },
    where: { id },
  });

  return NextResponse.json({ ok: true });
};
