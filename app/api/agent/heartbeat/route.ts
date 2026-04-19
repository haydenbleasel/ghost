import { prisma } from "@/lib/db";
import { AgentAuthError, verifyAgentRequest } from "@/lib/agent/signing";
import { heartbeatSchema } from "@/protocol";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  let body: string;
  let verified: Awaited<ReturnType<typeof verifyAgentRequest>>["verified"];
  try {
    ({ verified, body } = await verifyAgentRequest(request));
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const parsed = heartbeatSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.agent.update({
    data: {
      lastCommandId: parsed.data.lastCommandId ?? undefined,
      lastHeartbeatAt: new Date(),
    },
    where: { id: verified.agentId },
  });

  return NextResponse.json({ ok: true });
};
