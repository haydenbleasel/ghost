import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { MissingHetznerCredentialsError } from "@/lib/hetzner";
import { getUserHetznerContext } from "@/lib/hetzner/credentials";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const postSchema = z.object({ serverType: z.string().min(1) });

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

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!server.hetznerServerId) {
    return NextResponse.json(
      { error: "Server is not provisioned yet" },
      { status: 409 }
    );
  }

  if (server.observedState !== "stopped") {
    return NextResponse.json(
      { error: "Server must be stopped before rescaling" },
      { status: 409 }
    );
  }

  if (parsed.data.serverType === server.serverType) {
    return NextResponse.json(
      { error: "Already on this server type" },
      { status: 400 }
    );
  }

  let client: Awaited<ReturnType<typeof getUserHetznerContext>>["client"];
  try {
    ({ client } = await getUserHetznerContext(user.id));
  } catch (error) {
    if (error instanceof MissingHetznerCredentialsError) {
      return NextResponse.json(
        { error: "Configure your Hetzner credentials in account settings." },
        { status: 412 }
      );
    }
    throw error;
  }

  const { error: apiError, response } = await client.POST(
    "/servers/{id}/actions/change_type",
    {
      body: { server_type: parsed.data.serverType, upgrade_disk: false },
      params: { path: { id: Number(server.hetznerServerId) } },
    }
  );
  if (!response.ok) {
    const errorBody = apiError as { error?: { message?: string } } | undefined;
    const message = errorBody?.error?.message ?? response.statusText;
    return NextResponse.json({ error: message }, { status: response.status });
  }

  await prisma.server.update({
    data: { serverType: parsed.data.serverType },
    where: { id },
  });

  return NextResponse.json({ serverType: parsed.data.serverType });
};
