import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderApiError } from "@/lib/providers/errors";
import { getSession } from "@/lib/session";

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
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    end: url.searchParams.get("end"),
    start: url.searchParams.get("start"),
    type: url.searchParams.get("type"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const provider = getProvider();

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
