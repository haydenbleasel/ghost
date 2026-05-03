import { setTimeout as sleep } from "node:timers/promises";

import { NextResponse } from "next/server";

import { claimPendingCommands } from "@/lib/agent/commands";
import { AgentAuthError, verifyAgentRequest } from "@/lib/agent/signing";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_WAIT_SECONDS = 25;
const MAX_WAIT_SECONDS = 55;
const POLL_INTERVAL_MS = 750;

export const GET = async (request: Request) => {
  let verified: Awaited<ReturnType<typeof verifyAgentRequest>>["verified"];
  try {
    ({ verified } = await verifyAgentRequest(request));
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }

  const url = new URL(request.url);
  const waitSeconds = Math.min(
    MAX_WAIT_SECONDS,
    Math.max(1, Number(url.searchParams.get("wait") ?? DEFAULT_WAIT_SECONDS))
  );
  const deadline = Date.now() + waitSeconds * 1000;

  while (Date.now() < deadline) {
    if (request.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }

    const commands = await claimPendingCommands(verified.serverId);
    if (commands.length > 0) {
      return NextResponse.json({ commands });
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }

    await sleep(Math.min(POLL_INTERVAL_MS, remaining));
  }

  return new NextResponse(null, { status: 204 });
};
