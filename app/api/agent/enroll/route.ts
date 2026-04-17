import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { verifyBootstrapJwt } from '@/lib/agent/bootstrap';
import { enrollRequestSchema, enrollResponseSchema } from '@/protocol';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = enrollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let claims: { serverId: string; jti: string };
  try {
    claims = await verifyBootstrapJwt(parsed.data.bootstrapToken);
  } catch {
    return NextResponse.json(
      { error: 'Invalid bootstrap token' },
      { status: 401 }
    );
  }

  const enrollment = await prisma.agentEnrollment.findUnique({
    where: { jti: claims.jti },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: 'Enrollment not registered' },
      { status: 401 }
    );
  }

  if (enrollment.burnedAt) {
    return NextResponse.json({ error: 'Token already used' }, { status: 409 });
  }

  if (enrollment.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  if (enrollment.serverId !== claims.serverId) {
    return NextResponse.json({ error: 'Server mismatch' }, { status: 401 });
  }

  const agentId = `agt_${crypto.randomUUID()}`;

  const [, , agent] = await prisma.$transaction([
    prisma.agentEnrollment.update({
      where: { jti: claims.jti },
      data: { burnedAt: new Date() },
    }),
    prisma.agent.deleteMany({ where: { serverId: claims.serverId } }),
    prisma.agent.create({
      data: {
        id: agentId,
        serverId: claims.serverId,
        publicKey: parsed.data.publicKey,
        sessionVersion: 0,
      },
    }),
  ]);

  const response = enrollResponseSchema.parse({
    agentId: agent.id,
    serverId: agent.serverId,
    sessionVersion: agent.sessionVersion,
  });

  return NextResponse.json(response);
}
