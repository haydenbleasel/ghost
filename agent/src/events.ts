import type { State } from "./config";
import { signedFetch } from "./signing";
import { saveState } from "./config";
import { AGENT_HEADERS } from "../../protocol";
import type { Phase } from "../../protocol";

const FLUSH_INTERVAL_MS = 500;
const FLUSH_BYTES = 32 * 1024;

interface PendingActivity {
  clientEventId: string;
  agentSeq: number;
  phase: Phase;
  message: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

interface PendingLog {
  agentSeq: number;
  stream: "stdout" | "stderr";
  line: string;
  ts: string;
}

export class EventBuffer {
  private activity: PendingActivity[] = [];
  private logs: PendingLog[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private readonly state: State;

  constructor(state: State) {
    this.state = state;
  }

  enqueueActivity(
    input: Omit<PendingActivity, "agentSeq" | "clientEventId" | "occurredAt"> & {
      clientEventId?: string;
      occurredAt?: string;
    },
  ) {
    this.state.agentSeq += 1;
    this.activity.push({
      agentSeq: this.state.agentSeq,
      clientEventId: input.clientEventId ?? crypto.randomUUID(),
      message: input.message,
      metadata: input.metadata,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      phase: input.phase,
    });
    this.scheduleFlush();
  }

  enqueueLog(input: { stream: "stdout" | "stderr"; line: string; ts?: string }) {
    this.state.agentSeq += 1;
    this.logs.push({
      agentSeq: this.state.agentSeq,
      line: input.line,
      stream: input.stream,
      ts: input.ts ?? new Date().toISOString(),
    });
    const size = this.logs.reduce((acc, l) => acc + l.line.length, 0);
    if (size >= FLUSH_BYTES) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.timer) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  async flush(): Promise<void> {
    if (this.flushing) {
      return;
    }
    if (this.activity.length === 0 && this.logs.length === 0) {
      return;
    }
    this.flushing = true;

    const batchId = crypto.randomUUID();
    const activityBatch = this.activity;
    const logBatch = this.logs;
    this.activity = [];
    this.logs = [];

    try {
      const res = await signedFetch({
        agentId: this.state.agentId,
        body: { activity: activityBatch, logs: logBatch },
        extraHeaders: { [AGENT_HEADERS.BATCH]: batchId },
        method: "POST",
        privateKey: this.state.privateKey,
        url: `${this.state.apiBaseUrl}/api/agent/events`,
      });
      if (res.ok) {
        await saveState(this.state);
      } else {
        this.activity.unshift(...activityBatch);
        this.logs.unshift(...logBatch);
        console.warn(`events flush failed: ${res.status}`);
      }
    } catch (error) {
      this.activity.unshift(...activityBatch);
      this.logs.unshift(...logBatch);
      console.warn("events flush error", error);
    } finally {
      this.flushing = false;
    }
  }
}
