import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { hetzner } from "@/lib/hetzner";
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
  if (!server.hetznerServerId) {
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

  const { data, error, response } = await hetzner.GET("/servers/{id}/metrics", {
    params: {
      path: { id: Number(server.hetznerServerId) },
      query: {
        end: parsed.data.end,
        start: parsed.data.start,
        type: [parsed.data.type],
      },
    },
  });
  if (!response.ok) {
    const errorBody = error as { error?: { message?: string } } | undefined;
    const message = errorBody?.error?.message ?? response.statusText;
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json({ metrics: data?.metrics ?? null });
};
