---
"ghost": patch
---

Ack unimplemented agent commands as failed instead of succeeded. `UPLOAD_BACKUP` and `FETCH_LOGS` exist in the protocol but have no agent implementation; they previously fell through the switch and were acked as "succeeded", which would falsely report a backup or log fetch as done if one were ever enqueued.
