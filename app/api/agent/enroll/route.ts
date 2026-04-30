import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { verifyBootstrapJwt } from "@/lib/agent/bootstrap";
import { hookTokens } from "@/lib/workflows/hook-tokens";
import { enrollRequestSchema, enrollResponseSchema } from "@/protocol";
import { NextResponse } from "next/server";
import { resumeHook } from "workflow/api";

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
      { status: 400 },
    );
  }

  let claims: { serverId: string; jti: string };
  try {
    claims = await verifyBootstrapJwt(parsed.data.bootstrapToken);
  } catch {
    return NextResponse.json({ error: "Invalid bootstrap token" }, { status: 401 });
  }

  const enrollment = await prisma.agentEnrollment.findUnique({
    where: { jti: claims.jti },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not registered" }, { status: 401 });
  }

  if (enrollment.burnedAt) {
    return NextResponse.json({ error: "Token already used" }, { status: 409 });
  }

  if (enrollment.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  if (enrollment.serverId !== claims.serverId) {
    return NextResponse.json({ error: "Server mismatch" }, { status: 401 });
  }

  const agentId = `agt_${crypto.randomUUID()}`;

  await prisma.$transaction([
    prisma.agentEnrollment.update({
      data: { burnedAt: new Date() },
      where: { jti: claims.jti },
    }),
    prisma.agent.deleteMany({ where: { serverId: claims.serverId } }),
  ]);

  const agent = await prisma.agent.create({
    data: {
      id: agentId,
      publicKey: parsed.data.publicKey,
      serverId: claims.serverId,
      sessionVersion: 0,
    },
  });

  const response = enrollResponseSchema.parse({
    agentId: agent.id,
    serverId: agent.serverId,
    sessionVersion: agent.sessionVersion,
  });

  try {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- resumeHook requires an explicit payload
    await resumeHook(hookTokens.enrolled(agent.serverId), undefined);
  } catch (error) {
    console.error("[enroll] resumeHook failed", { serverId: agent.serverId, error });
  }

  return NextResponse.json(response);
};
