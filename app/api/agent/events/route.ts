import { prisma } from '@/lib/db';
import { AgentAuthError, verifyAgentRequest } from '@/lib/agent/signing';
import { emitActivity, emitLog } from '@/lib/events/emit';
import { AGENT_HEADERS, eventBatchSchema } from '@/protocol';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: string;
  let verified: Awaited<ReturnType<typeof verifyAgentRequest>>['verified'];
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
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  for (const event of parsed.data.activity) {
    await emitActivity({
      serverId: verified.serverId,
      phase: event.phase,
      message: event.message,
      metadata: { ...event.metadata, batchId, agentSeq: event.agentSeq },
      source: 'agent',
      occurredAt: new Date(event.occurredAt),
    });
  }

  for (const logLine of parsed.data.logs) {
    await emitLog({
      serverId: verified.serverId,
      stream: logLine.stream,
      line: logLine.line,
      ts: new Date(logLine.ts),
    });
  }

  if (parsed.data.activity.length > 0 || parsed.data.logs.length > 0) {
    await prisma.agent.update({
      where: { id: verified.agentId },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
