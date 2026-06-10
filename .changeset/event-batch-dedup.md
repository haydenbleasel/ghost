---
"ghost": patch
---

Deduplicate retried agent event batches. When the agent re-sent a batch after a lost response, the server assigned fresh ids and seqs, duplicating activity timeline entries and log lines. Agent-sourced rows now use deterministic ids derived from the protocol's `clientEventId` (activity) and `agentSeq` (logs), scoped by agent id, so replayed inserts are dropped.
