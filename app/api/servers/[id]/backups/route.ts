import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getProviderForUser } from "@/lib/providers";
import {
  MissingProviderCredentialsError,
  ProviderApiError,
} from "@/lib/providers/errors";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const patchSchema = z.object({ enabled: z.boolean() });
const postSchema = z.object({
  description: z.string().trim().max(100).optional(),
});

const credsErrorResponse = () =>
  NextResponse.json(
    { error: "Configure your Hetzner credentials in account settings." },
    { status: 412 }
  );

const resolveProvider = async (userId: string) => {
  try {
    return await getProviderForUser(userId);
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      return null;
    }
    throw error;
  }
};

const apiErrorResponse = (error: ProviderApiError) =>
  NextResponse.json({ error: error.message }, { status: error.status });

export const GET = async (
  _request: Request,
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

  if (!server.providerServerId) {
    return NextResponse.json({ images: [] });
  }

  const provider = await resolveProvider(user.id);
  if (!provider) {
    return credsErrorResponse();
  }

  try {
    const images = await provider.listImagesForServer(server.providerServerId);
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
  const user = await requireUser();
  const { id } = await context.params;

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

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const provider = await resolveProvider(user.id);
  if (!provider) {
    return credsErrorResponse();
  }

  try {
    const imageId = await provider.createSnapshot(server.providerServerId, {
      description: parsed.data.description,
    });
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
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
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

  const provider = await resolveProvider(user.id);
  if (!provider) {
    return credsErrorResponse();
  }

  try {
    await provider.setBackupsEnabled(
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
