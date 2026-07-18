import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderApiError } from "@/lib/providers/errors";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const patchSchema = z.object({ enabled: z.boolean() });
const postSchema = z.object({
  description: z.string().trim().max(100).optional(),
});

const apiErrorResponse = (error: ProviderApiError) =>
  NextResponse.json({ error: error.message }, { status: error.status });

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!server.providerServerId) {
    return NextResponse.json({ images: [] });
  }

  try {
    const images = await getProvider().listImagesForServer(
      server.providerServerId
    );
    return NextResponse.json({
      images: images.map((img) => ({
        created: img.createdAt,
        description: img.description,
        diskSize: img.diskSizeGb,
        id: img.id,
        imageSize: img.imageSizeGb,
        protection: img.protected,
        status: img.status,
        type: img.type,
      })),
    });
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return apiErrorResponse(error);
    }
    throw error;
  }
};

export const POST = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  await requireUser();
  const { id } = await context.params;

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

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const imageId = await getProvider().createSnapshot(
      server.providerServerId,
      { description: parsed.data.description }
    );
    return NextResponse.json({ image: { id: imageId } });
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return apiErrorResponse(error);
    }
    throw error;
  }
};

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!server.providerServerId) {
    return NextResponse.json(
      { error: "Server is not provisioned yet" },
      { status: 409 }
    );
  }

  try {
    await getProvider().setBackupsEnabled(
      server.providerServerId,
      parsed.data.enabled
    );
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return apiErrorResponse(error);
    }
    throw error;
  }

  await prisma.server.update({
    data: { backupsEnabled: parsed.data.enabled },
    where: { id },
  });

  return NextResponse.json({ backupsEnabled: parsed.data.enabled });
};
