import { ackCommand } from '@/lib/agent/commands';
import { prisma } from '@/lib/db';
import { AgentAuthError, verifyAgentRequest } from '@/lib/agent/signing';
import { commandAckSchema } from '@/protocol';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

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

  const parsed = commandAckSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const command = await prisma.command.findUnique({ where: { id } });
  if (!command || command.serverId !== verified.serverId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await ackCommand({
    commandId: id,
    status: parsed.data.status === 'failed' ? 'failed' : 'succeeded',
    durationMs: parsed.data.durationMs,
    result: parsed.data.result,
    error: parsed.data.error,
  });

  await prisma.agent.update({
    where: { id: verified.agentId },
    data: { lastCommandId: id },
  });

  return NextResponse.json({ ok: true });
}
