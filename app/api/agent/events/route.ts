import { NextResponse } from "next/server";
import { resumeHook } from "workflow/api";

import { AgentAuthError, verifyAgentRequest } from "@/lib/agent/signing";
import { prisma } from "@/lib/db";
import { emitActivity, emitLog } from "@/lib/events/emit";
import { hookTokens } from "@/lib/workflows/hook-tokens";
import { AGENT_HEADERS, eventBatchSchema } from "@/protocol";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  let body: string;
  let verified: Awaited<ReturnType<typeof verifyAgentRequest>>["verified"];
  try {
    ({ verified, body } = await verifyAgentRequest(request));
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }

  const batchId = request.headers.get(AGENT_HEADERS.BATCH);

  const parsed = eventBatchSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json(
      { details: parsed.error.flatten(), error: "Invalid body" },
      { status: 400 }
    );
  }

  for (const event of parsed.data.activity) {
    await emitActivity({
      message: event.message,
      metadata: { ...event.metadata, agentSeq: event.agentSeq, batchId },
      occurredAt: new Date(event.occurredAt),
      phase: event.phase,
      serverId: verified.serverId,
      source: "agent",
    });

    try {
      await resumeHook(hookTokens.phase(verified.serverId), event.phase);
    } catch {
      // No workflow is waiting on this phase, or it has already moved on.
    }
  }

  for (const logLine of parsed.data.logs) {
    await emitLog({
      line: logLine.line,
      serverId: verified.serverId,
      stream: logLine.stream,
      ts: new Date(logLine.ts),
    });
  }

  if (parsed.data.activity.length > 0 || parsed.data.logs.length > 0) {
    await prisma.agent.update({
      data: { lastHeartbeatAt: new Date() },
      where: { id: verified.agentId },
    });
  }

  return NextResponse.json({ ok: true });
};
