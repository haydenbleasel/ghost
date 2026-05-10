import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getProviderForUser } from "@/lib/providers";
import {
  MissingProviderCredentialsError,
  ProviderApiError,
} from "@/lib/providers/errors";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const credsErrorResponse = () =>
  NextResponse.json(
    { error: "Configure your Hetzner credentials in account settings." },
    { status: 412 }
  );

const apiErrorResponse = (error: ProviderApiError) =>
  NextResponse.json({ error: error.message }, { status: error.status });

export const DELETE = async (
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

  if (!server.providerServerId) {
    return NextResponse.json(
      { error: "Server is not provisioned yet" },
      { status: 409 }
    );
  }

  let provider: Awaited<ReturnType<typeof getProviderForUser>>;
  try {
    provider = await getProviderForUser(user.id);
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      return credsErrorResponse();
    }
    throw error;
  }

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
    await provider.deleteImage(imageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return apiErrorResponse(error);
    }
    throw error;
  }
};
