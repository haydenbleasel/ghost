import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { verifyBootstrapJwt } from "@/lib/agent/bootstrap";
import { prisma } from "@/lib/db";
import { enrollRequestSchema, enrollResponseSchema } from "@/protocol";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = enrollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { details: parsed.error.flatten(), error: "Invalid body" },
      { status: 400 }
    );
  }

  let claims: { serverId: string; jti: string };
  try {
    claims = await verifyBootstrapJwt(parsed.data.bootstrapToken);
  } catch {
    return NextResponse.json(
      { error: "Invalid bootstrap token" },
      { status: 401 }
    );
  }

  const enrollment = await prisma.agentEnrollment.findUnique({
    where: { jti: claims.jti },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not registered" },
      { status: 401 }
    );
  }

  // A burned token with a matching public key is a retry of an enrollment
  // that already succeeded but whose response was lost — replay the success
  // instead of bricking the agent with a 409 loop (it persists its keypair
  // before the POST precisely so this check can work).
  const replayResponse = async () => {
    const existing = await prisma.agent.findUnique({
      where: { serverId: claims.serverId },
    });
    if (existing && existing.publicKey === parsed.data.publicKey) {
      return NextResponse.json(
        enrollResponseSchema.parse({
          agentId: existing.id,
          serverId: existing.serverId,
          sessionVersion: existing.sessionVersion,
        })
      );
    }
    return null;
  };

  if (enrollment.burnedAt) {
    const replay = await replayResponse();
    if (replay) {
      return replay;
    }
    return NextResponse.json({ error: "Token already used" }, { status: 409 });
  }

  if (enrollment.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  if (enrollment.serverId !== claims.serverId) {
    return NextResponse.json({ error: "Server mismatch" }, { status: 401 });
  }

  const agentId = `agt_${crypto.randomUUID()}`;

  // Burn the token and create the agent atomically: if the create fails, the
  // burn must roll back too, otherwise the VM's retry hits "Token already
  // used" forever and the server can never enroll. The conditional burn also
  // makes concurrent requests with the same token race safely — only one
  // wins the row.
  const agent = await prisma.$transaction(async (tx) => {
    const burned = await tx.agentEnrollment.updateMany({
      data: { burnedAt: new Date() },
      where: { burnedAt: null, jti: claims.jti },
    });
    if (burned.count === 0) {
      return null;
    }
    await tx.agent.deleteMany({ where: { serverId: claims.serverId } });
    return await tx.agent.create({
      data: {
        id: agentId,
        publicKey: parsed.data.publicKey,
        serverId: claims.serverId,
        sessionVersion: 0,
      },
    });
  });

  if (!agent) {
    // Lost the burn race — if the winner was this same agent retrying
    // concurrently, its row carries the same key; replay the success.
    const replay = await replayResponse();
    if (replay) {
      return replay;
    }
    return NextResponse.json({ error: "Token already used" }, { status: 409 });
  }

  const response = enrollResponseSchema.parse({
    agentId: agent.id,
    serverId: agent.serverId,
    sessionVersion: agent.sessionVersion,
  });

  return NextResponse.json(response);
};
