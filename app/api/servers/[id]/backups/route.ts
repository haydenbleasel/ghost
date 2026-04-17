import { prisma } from "@/lib/db";
import { hetzner } from "@/lib/hetzner";
import { requireUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({ enabled: z.boolean() });
const postSchema = z.object({
  description: z.string().trim().max(100).optional(),
});

type HetznerError = { error?: { message?: string } } | undefined;

const hetznerErrorMessage = (error: unknown, response: Response): string => {
  const body = error as HetznerError;
  return body?.error?.message ?? response.statusText;
};

export const GET = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!server.hetznerServerId) {
    return NextResponse.json({ images: [] });
  }

  const hetznerId = Number(server.hetznerServerId);

  const { data, error, response } = await hetzner.GET("/images", {
    params: { query: { per_page: 50, sort: ["created:desc"], type: ["backup", "snapshot"] } },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(error, response) },
      { status: response.status },
    );
  }

  const images = (data?.images ?? [])
    .filter(
      (img) =>
        img.bound_to === hetznerId ||
        (img.type === "snapshot" && img.created_from?.id === hetznerId),
    )
    .map((img) => ({
      created: img.created,
      description: img.description,
      diskSize: img.disk_size,
      id: img.id,
      imageSize: img.image_size,
      protection: img.protection.delete,
      status: img.status,
      type: img.type,
    }));

  return NextResponse.json({ images });
};

export const POST = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const server = await prisma.server.findFirst({
    where: { deletedAt: null, id, userId: user.id },
  });

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!server.hetznerServerId) {
    return NextResponse.json({ error: "Server is not provisioned yet" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { error, response, data } = await hetzner.POST("/servers/{id}/actions/create_image", {
    body: {
      description: parsed.data.description || undefined,
      type: "snapshot",
    },
    params: { path: { id: Number(server.hetznerServerId) } },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(error, response) },
      { status: response.status },
    );
  }

  return NextResponse.json({ image: data?.image ?? null });
};

export const PATCH = async (request: Request, context: { params: Promise<{ id: string }> }) => {
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

  if (!server.hetznerServerId) {
    return NextResponse.json({ error: "Server is not provisioned yet" }, { status: 409 });
  }

  const hetznerId = Number(server.hetznerServerId);

  const path = parsed.data.enabled
    ? ("/servers/{id}/actions/enable_backup" as const)
    : ("/servers/{id}/actions/disable_backup" as const);
  const { error: apiError, response } = await hetzner.POST(path, {
    params: { path: { id: hetznerId } },
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: hetznerErrorMessage(apiError, response) },
      { status: response.status },
    );
  }

  await prisma.server.update({
    data: { backupsEnabled: parsed.data.enabled },
    where: { id },
  });

  return NextResponse.json({ backupsEnabled: parsed.data.enabled });
};
