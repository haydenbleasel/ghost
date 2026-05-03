import { NextResponse } from "next/server";

import { AgentAuthError, verifyAgentRequest } from "@/lib/agent/signing";
import { prisma } from "@/lib/db";
import { rotateKeyRequestSchema } from "@/protocol";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  try {
    const { verified, body } = await verifyAgentRequest(request);
    const parsed = rotateKeyRequestSchema.safeParse(JSON.parse(body));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const agent = await prisma.agent.update({
      data: {
        publicKey: parsed.data.newPublicKey,
        sessionVersion: { increment: 1 },
      },
      where: { id: verified.agentId },
    });

    return NextResponse.json({ sessionVersion: agent.sessionVersion });
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
};
