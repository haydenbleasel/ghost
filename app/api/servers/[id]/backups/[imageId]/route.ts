import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { MissingHetznerCredentialsError } from "@/lib/hetzner";
import { getUserHetznerContext } from "@/lib/hetzner/credentials";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type HetznerError = { error?: { message?: string } } | undefined;

const hetznerErrorMessage = (error: unknown, response: Response): string => {
  const body = error as HetznerError;
  return body?.error?.message ?? response.statusText;
};

const credsErrorResponse = () =>
  NextResponse.json(
    { error: "Configure your Hetzner credentials in account settings." },
    { status: 412 }
  );

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

  let client: Awaited<ReturnType<typeof getUserHetznerContext>>["client"];
  try {
    ({ client } = await getUserHetznerContext(user.id));
  } catch (err) {
    if (err instanceof MissingHetznerCredentialsError) {
      return credsErrorResponse();
    }
    throw err;
  }

  const {
    data: imageData,
    error: getError,
    response: getResponse,
  } = await client.GET("/images/{id}", {
    params: { path: { id: parsedImageId } },
  });

  if (!getResponse.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(getError, getResponse) },
      { status: getResponse.status }
    );
  }

  const image = imageData?.image;
  const hetznerServerId = Number(server.hetznerServerId);
  const belongs =
    image?.bound_to === hetznerServerId ||
    (image?.type === "snapshot" && image.created_from?.id === hetznerServerId);

  if (!(image && belongs)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error, response } = await client.DELETE("/images/{id}", {
    params: { path: { id: parsedImageId } },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(error, response) },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true });
};
