---
"ghost": patch
---

Make hibernation snapshot creation crash-safe — a retried step whose previous snapshot succeeded but was never recorded created a second snapshot and orphaned the first, billed per-GB forever; the step now adopts an existing snapshot carrying the server's deterministic description before creating a new one
