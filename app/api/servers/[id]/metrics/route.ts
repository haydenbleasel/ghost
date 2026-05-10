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

const querySchema = z.object({
  end: z.string().datetime(),
  start: z.string().datetime(),
  type: z.enum(["cpu", "disk", "network"]),
});

export const GET = async (
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

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    end: url.searchParams.get("end"),
    start: url.searchParams.get("start"),
    type: url.searchParams.get("type"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  let provider: Awaited<ReturnType<typeof getProviderForUser>>;
  try {
    provider = await getProviderForUser(user.id);
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      return NextResponse.json(
        { error: "Configure your Hetzner credentials in account settings." },
        { status: 412 }
      );
    }
    throw error;
  }

  try {
    const result = await provider.getMetrics(server.providerServerId, {
      end: parsed.data.end,
      kind: parsed.data.type,
      start: parsed.data.start,
    });
    return NextResponse.json({ metrics: result.metrics });
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
};
