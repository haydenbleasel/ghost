---
"ghost": patch
---

Fix lost agent events: a failed event flush never scheduled a retry (terminal events like 'Game stopped' could be dropped forever on a quiet agent), and concurrent flushes silently no-oped, letting shutdown discard buffered events mid-flight; flushes are now serialized and rescheduled on failure
