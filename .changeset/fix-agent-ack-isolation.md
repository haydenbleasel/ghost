---
"ghost": patch
---

Report agent command results accurately when the ack POST fails transiently — a succeeded command was re-acked as failed and the remaining commands in the envelope were abandoned; acks are now best-effort and isolated from command execution
